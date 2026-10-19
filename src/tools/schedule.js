// Schedule tool: which day type is today, which block is happening now, what is next.
// Pure functions over src/data/bell-schedule.json and school-calendar-2026-27.json.

const WEEKDAY_PATTERN = { 1: '0-7', 2: 'A-Day', 3: 'B-Day', 4: 'A-Day', 5: 'B-Day' };

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

// Returns { type, label, schedule } where schedule is a key of bell.dayTypes or null.
export function dayTypeFor(date, { bell, cal }) {
  const key = isoDate(date);
  const observed = cal.dayTypesObserved?.[key];
  if (observed) {
    const schedule = bell.dayTypes[observed] ? observed : observed.startsWith('B-Day') ? 'B-Day' : null;
    return { type: observed, label: observed, schedule };
  }
  for (const off of cal.noClasses ?? []) {
    const end = off.through ?? off.date;
    if (key >= off.date && key <= end) return { type: 'No classes', label: `No classes: ${off.label}`, schedule: null };
  }
  const wd = date.getDay();
  const t = WEEKDAY_PATTERN[wd];
  if (!t) return { type: 'Weekend', label: 'Weekend', schedule: null };
  return { type: t, label: `${t} (usual pattern)`, schedule: t };
}

const mins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const fmt = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); const hr = ((h + 11) % 12) + 1; return `${hr}:${String(m).padStart(2, '0')}`; };

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
