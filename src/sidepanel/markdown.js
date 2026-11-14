// Tiny, safe Markdown renderer. Model output and page text are untrusted, so the
// DOM is built ONLY with createElement / createTextNode / textContent. Never
// innerHTML. Raw HTML in the input shows up as literal text.

const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };

// Inline: `code`, **bold**, *italic*, _italic_, [text](http(s)://url). Anything else is text.
const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|(?<![\w])_([^_\s][^_]*)_(?![\w])|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

function inline(text, parent) {
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) parent.append(document.createTextNode(text.slice(last, m.index)));
    let node;
    if (m[1] !== undefined) { node = el('code'); node.textContent = m[1]; }
    else if (m[2] !== undefined) { node = el('strong'); inline(m[2], node); }
    else if (m[3] !== undefined || m[4] !== undefined) { node = el('em'); inline(m[3] ?? m[4], node); }
    else {
      node = el('a');
      node.href = m[6];
      node.target = '_blank';
      node.rel = 'noopener noreferrer';
      node.textContent = m[5];
    }
    parent.append(node);
    last = m.index + m[0].length;
  }
  if (last < text.length) parent.append(document.createTextNode(text.slice(last)));
}

function lines(text, parent) {
  text.split('\n').forEach((line, i) => {
    if (i) parent.append(el('br'));
    inline(line, parent);
  });
}

export function renderMarkdown(text) {
  const out = document.createDocumentFragment();
  const src = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  const startsBlock = (l) => /^(#{1,3}\s|```|>|\s*[-*]\s|\s*\d+\.\s|-{3,}\s*$)/.test(l);

  while (i < src.length) {
    const line = src[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith('```')) {
      const code = [];
      i++;
      while (i < src.length && !src[i].startsWith('```')) code.push(src[i++]);
      i++;
      const pre = el('pre'), c = el('code');
      c.textContent = code.join('\n');
      pre.append(c);
      out.append(pre);
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const n = el(h[1].length < 3 ? 'h3' : 'h4', 'md-h');
      inline(h[2], n);
      out.append(n); i++; continue;
    }

    if (/^-{3,}\s*$/.test(line)) { out.append(el('hr')); i++; continue; }

    if (line.startsWith('>')) {
      const q = el('blockquote'), body = [];
      while (i < src.length && src[i].startsWith('>')) body.push(src[i++].replace(/^>\s?/, ''));
      lines(body.join('\n'), q);
      out.append(q); continue;
    }

    const ul = /^\s*[-*]\s+(.*)$/, ol = /^\s*\d+\.\s+(.*)$/;
    const re = ul.test(line) ? ul : ol.test(line) ? ol : null;
    if (re) {
      const list = el(re === ul ? 'ul' : 'ol');
      if (re === ol) list.start = parseInt(line, 10);
      while (i < src.length && re.test(src[i])) {
        const li = el('li');
        inline(src[i].match(re)[1], li);
        list.append(li); i++;
      }
      out.append(list); continue;
    }

    const para = [];
    while (i < src.length && src[i].trim() && (!para.length || !startsBlock(src[i]))) para.push(src[i++]);
    const p = el('p');
    lines(para.join('\n'), p);
    out.append(p);
  }
  return out;
}
