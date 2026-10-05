// A tiny 3x5 pixel font for digits, drawn as rectangles (used on the New Year hat, the Pi Day shirt and the falling digits of pi)
const GLYPHS = {
  0: '111101101101111',
  1: '010110010010111',
  2: '111001111100111',
  3: '111001111001111',
  4: '101101111001001',
  5: '111100111001111',
  6: '111100111101111',
  7: '111001001001001',
  8: '111101111101111',
  9: '111101111001111',
  '.': '000000000000010',
  '%': '101001010100101',
  '-': '000000111000000',
}

// Returns the rectangles for the text, each glyph 3 cells wide with one cell between, `cell` units per cell
export function digitsSvg(text, x, y, cell, fill) {
  let out = ''
  let cursor = x
  for (const ch of String(text)) {
    const glyph = GLYPHS[ch]
    if (!glyph) continue
    for (let i = 0; i < 15; i++) {
      if (glyph[i] === '1') out += `<rect x="${+(cursor + (i % 3) * cell).toFixed(2)}" y="${+(y + Math.floor(i / 3) * cell).toFixed(2)}" width="${cell}" height="${cell}" fill="${fill}"/>`
    }
    cursor += cell * 4
  }
  return out
}
