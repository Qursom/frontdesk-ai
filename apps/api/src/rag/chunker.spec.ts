import { chunkMarkdown } from './chunker';

describe('chunkMarkdown', () => {
  it('keeps each heading with its text', () => {
    const chunks = chunkMarkdown('## Opening hours\nMonday: 8:30am – 6:00pm\n\n## Contact\nPhone: 020 7946 0321');

    expect(chunks).toEqual([
      { heading: 'Opening hours', text: 'Opening hours\nMonday: 8:30am – 6:00pm' },
      { heading: 'Contact', text: 'Contact\nPhone: 020 7946 0321' },
    ]);
  });

  it('builds a breadcrumb from parent headings', () => {
    const md = [
      '# Clinic',
      '## Prices',
      'All prices are a guide.',
      '### Cosmetic treatments',
      '- Whitening: £350',
      '### Restorative treatments',
      '- Crown: from £750',
      '## Children',
      'We see children from their first tooth.',
    ].join('\n');

    expect(chunkMarkdown(md).map((c) => c.heading)).toEqual([
      'Clinic > Prices',
      'Clinic > Prices > Cosmetic treatments',
      'Clinic > Prices > Restorative treatments',
      'Clinic > Children', // a new ## drops the old ### from the breadcrumb
    ]);
  });

  it('starts every chunk with its heading, so retrieval has context', () => {
    const chunks = chunkMarkdown('# Clinic\n## Prices\n### Cosmetic\n- Whitening: £350');
    expect(chunks[0].text).toBe('Clinic > Prices > Cosmetic\n- Whitening: £350');
  });

  it('puts text before the first heading under "General"', () => {
    expect(chunkMarkdown('Welcome to the clinic.')).toEqual([{ heading: 'General', text: 'General\nWelcome to the clinic.' }]);
  });

  it('skips headings with no text', () => {
    expect(chunkMarkdown('## Empty\n\n## Full\nSome text').map((c) => c.heading)).toEqual(['Full']);
  });

  it('handles Windows line endings', () => {
    expect(chunkMarkdown('## Contact\r\nPhone: 020 7946 0321\r\n')).toEqual([
      { heading: 'Contact', text: 'Contact\nPhone: 020 7946 0321' },
    ]);
  });

  it('returns nothing for empty input', () => {
    expect(chunkMarkdown('')).toEqual([]);
    expect(chunkMarkdown('\n\n  \n')).toEqual([]);
  });

  describe('long sections', () => {
    const para = (n: number) => `Paragraph ${n} ${'x'.repeat(80)}`;
    const md = `## FAQ\n${[1, 2, 3, 4, 5].map(para).join('\n\n')}`;

    it('splits by paragraph and repeats the heading on every chunk', () => {
      const chunks = chunkMarkdown(md, 200);

      expect(chunks.length).toBeGreaterThan(1);
      for (const c of chunks) {
        expect(c.heading).toBe('FAQ');
        expect(c.text.startsWith('FAQ\n')).toBe(true);
      }
    });

    it('overlaps by one paragraph and loses no text', () => {
      const chunks = chunkMarkdown(md, 200);

      for (let i = 1; i < chunks.length; i++) {
        const prevLast = chunks[i - 1].text.split('\n\n').pop();
        const firstHere = chunks[i].text.replace(/^FAQ\n/, '').split('\n\n')[0];
        expect(firstHere).toBe(prevLast);
      }
      const all = chunks.map((c) => c.text).join('\n');
      for (const n of [1, 2, 3, 4, 5]) expect(all).toContain(para(n));
    });

    it('does not overlap when overlapParas is 0', () => {
      const chunks = chunkMarkdown(md, 200, 0);
      const bodies = chunks.flatMap((c) => c.text.replace(/^FAQ\n/, '').split('\n\n'));
      expect(bodies).toEqual([1, 2, 3, 4, 5].map(para));
    });

    it('keeps a short section in one chunk', () => {
      expect(chunkMarkdown(md, 5000)).toHaveLength(1);
    });
  });
});
