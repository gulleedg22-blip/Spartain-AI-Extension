// Schedule logic: which day type a date is, which block is happening now, what is next.
// Pure functions over src/data/bell-schedule.json and school-calendar-2026-27.json.
// No DOM in this file. The side panel calls scheduleSnapshot() and renders the result.
//
// Where a day type comes from, most trusted first (day.source):
//   'school calendar'   dayTypesObserved, copied from the school's published calendar
//   'no classes'        holidays and breaks from the calendar framework
//   'out of session'    before the first day or after the last day of the school year
//   'finals'            final exam days (special schedule, no regular blocks)
//   'weekend'
//   'student calendar'  dayTypesProjected, from a student's own calendar (not official)
//   'weekday pattern'   Mon 0-7, Tue/Thu A, Wed/Fri B. A guess: day.estimated is true.

const WEEKDAY_PATTERN = { 1: '0-7', 2: 'A-Day', 3: 'B-Day', 4: 'A-Day', 5: 'B-Day' };
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function loadScheduleData() {
  const [bell, cal] = await Promise.all([
    fetch(chrome.runtime.getURL('src/data/bell-schedule.json')).then((r) => r.json()),
    fetch(chrome.runtime.getURL('src/data/school-calendar-2026-27.json')).then((r) => r.json()),
  ]);
  return { bell, cal };
}

export function isoDate(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const inRange = (key, entry) => key >= entry.date && key <= (entry.through ?? entry.date);

// Map a day-type name to a key of bell.dayTypes, or null when it has no regular blocks.
function scheduleKey(type, bell) {
  if (bell.dayTypes[type]) return type;
  if (/^0-7/.test(type)) return '0-7';
  if (/^A-Day/.test(type)) return 'A-Day';
  if (/^B-Day/.test(type)) {
    if (/late start/i.test(type)) return 'B-Day Late Start';
    if (/mass|assembly/i.test(type)) return 'B-Day Mass or Assembly';
    if (/rally/i.test(type)) return 'B-Day Rally';
    return 'B-Day';
  }
  return null;
}

// Returns { type, label, schedule, source, estimated }.
// schedule is a key of bell.dayTypes, or null when there are no regular blocks that day.
export function dayTypeFor(date, { bell, cal }) {
  const key = isoDate(date);
  const day = (type, source, extra = {}) => ({ type, label: type, schedule: scheduleKey(type, bell), source, estimated: false, ...extra });

  const observed = cal.dayTypesObserved?.[key];
  if (observed) return day(observed, 'school calendar');

  for (const off of cal.noClasses ?? []) {
    if (inRange(key, off)) return day('No classes', 'no classes', { label: `No classes: ${off.label}`, schedule: null });
  }
  if ((cal.firstDay && key < cal.firstDay) || (cal.lastDay && key > cal.lastDay)) {
    return day('No classes', 'out of session', { label: 'No classes: school is not in session', schedule: null });
  }
  for (const f of cal.finals ?? []) {
    if (inRange(key, f)) return day('Final exams', 'finals', { label: `${f.label} (special schedule)`, schedule: null });
  }
  if (!WEEKDAY_PATTERN[date.getDay()]) return day('Weekend', 'weekend', { schedule: null });

  const projected = cal.dayTypesProjected?.[key];
  if (projected) return day(projected, 'student calendar');

  return day(WEEKDAY_PATTERN[date.getDay()], 'weekday pattern', { estimated: true });
}

// The blocks to show for a day. 0 period is hidden unless opts.zeroPeriod is true.
// Academic Time is shown only on days whose type names it.
export function blocksFor(day, bell, opts = {}) {
  if (!day?.schedule) return [];
  const academic = /academic time/i.test(day.type);
  return bell.dayTypes[day.schedule].blocks.filter((b) => {
    if (b.name === 'P0') return !!opts.zeroPeriod;
    if (b.name === 'Academic Time') return academic;
    return !b.optional;
  });
}

const mins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const fmt = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); const hr = ((h + 11) % 12) + 1; return `${hr}:${String(m).padStart(2, '0')}`; };
export const fmtDate = (d) => `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;

// { current, next, minutesLeft, minutesUntilNext } for a block list at a given time.
export function whereInDay(blocks, date) {
  const now = date.getHours() * 60 + date.getMinutes();
  const current = blocks.find((b) => mins(b.start) <= now && now < mins(b.end)) ?? null;
  const next = blocks.find((b) => mins(b.start) > now) ?? null;
  return {
    current,
    next,
    minutesLeft: current ? mins(current.end) - now : null,
    minutesUntilNext: next ? mins(next.start) - now : null,
  };
}

// The next day after `date` that has regular blocks, or null if none within 60 days.
// Returns { date, dateLabel, day, firstBlock }.
export function nextSchoolDay(date, data, opts = {}) {
  for (let i = 1; i <= 60; i++) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + i);
    const day = dayTypeFor(d, data);
    const blocks = blocksFor(day, data.bell, opts);
    if (blocks.length) return { date: d, dateLabel: fmtDate(d), day, firstBlock: blocks[0] };
  }
  return null;
}

// Everything the UI needs for one moment in time.
//   day        result of dayTypeFor
//   blocks     today's blocks ([] when there are none)
//   current    the block happening now, or null (passing period, before or after school)
//   next       the next block today, or null
//   minutesLeft / minutesUntilNext
//   progress   0..1 through the current block, or null
//   state      'in-block' | 'between' | 'before' | 'after' | 'off'
//   upcoming   nextSchoolDay(...) when state is 'after' or 'off', else null
export function scheduleSnapshot(date, data, opts = {}) {
  const day = dayTypeFor(date, data);
  const blocks = blocksFor(day, data.bell, opts);
  const pos = blocks.length ? whereInDay(blocks, date) : { current: null, next: null, minutesLeft: null, minutesUntilNext: null };
  const nowMin = date.getHours() * 60 + date.getMinutes();
  let state = 'off';
  if (blocks.length) {
    if (pos.current) state = 'in-block';
    else if (!pos.next) state = 'after';
    else state = nowMin < mins(blocks[0].start) ? 'before' : 'between';
  }
  const progress = pos.current ? (nowMin - mins(pos.current.start)) / (mins(pos.current.end) - mins(pos.current.start)) : null;
  const upcoming = state === 'off' || state === 'after' ? nextSchoolDay(date, data, opts) : null;
  return { day, blocks, ...pos, progress, state, upcoming };
}
