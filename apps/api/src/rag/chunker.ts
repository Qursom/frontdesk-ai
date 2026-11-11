export interface RawChunk {
  heading: string;
  text: string;
}

/**
 * Markdown-aware splitter:
 * 1) split on "## " / "### " headings (each FAQ / section stays together),
 * 2) long sections are split by paragraph with a small overlap,
 * 3) every chunk starts with its heading so retrieval has context.
 */
export function chunkMarkdown(markdown: string, maxChars = 1200, overlapParas = 1): RawChunk[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const sections: { heading: string; body: string[] }[] = [];
  let parents: string[] = [];
  let current = { heading: 'General', body: [] as string[] };

  for (const line of lines) {
    const m = /^(#{1,3})\s+(.*)$/.exec(line);
    if (m) {
      if (current.body.join('').trim()) sections.push(current);
      const level = m[1].length;
      parents = parents.slice(0, level - 1);
      parents[level - 1] = m[2].trim();
      current = { heading: parents.filter(Boolean).join(' > '), body: [] };
    } else {
      current.body.push(line);
    }
  }
  if (current.body.join('').trim()) sections.push(current);

  const chunks: RawChunk[] = [];
  for (const s of sections) {
    const paras = s.body
      .join('\n')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    let buf: string[] = [];
    const flush = () => {
      if (!buf.length) return;
      chunks.push({ heading: s.heading, text: `${s.heading}\n${buf.join('\n\n')}` });
    };
    for (const p of paras) {
      if (buf.length && [...buf, p].join('\n\n').length > maxChars) {
        flush();
        // slice(-0) would return the whole buffer, so 0 must mean "no overlap" explicitly.
        buf = overlapParas > 0 ? buf.slice(-overlapParas) : [];
      }
      buf.push(p);
    }
    flush();
  }
  return chunks;
}
