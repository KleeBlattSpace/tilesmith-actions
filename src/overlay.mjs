import { PNG } from 'pngjs';

const COLORS = {
  Production: { r: 46, g: 160, b: 67 },
  Review: { r: 230, g: 159, b: 0 },
  Reject: { r: 196, g: 40, b: 40 },
};

const FONT = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['110', '001', '010', '100', '111'],
  3: ['110', '001', '010', '001', '110'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '110', '001', '110'],
  6: ['011', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '110'],
  A: ['010', '101', '111', '101', '101'],
  C: ['111', '100', '100', '100', '111'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  I: ['111', '010', '010', '010', '111'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'],
  N: ['101', '111', '111', '101', '101'],
  O: ['111', '101', '101', '101', '111'],
  P: ['110', '101', '110', '100', '100'],
  Q: ['111', '101', '101', '111', '011'],
  R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'],
  W: ['101', '101', '111', '111', '010'],
  X: ['101', '101', '010', '101', '101'],
  ' ': ['000', '000', '000', '000', '000'],
  ':': ['000', '010', '000', '010', '000'],
  '/': ['001', '001', '010', '100', '100'],
};

const WHITE = { r: 255, g: 255, b: 255 };
const BAR = { r: 18, g: 20, b: 24 };
const PIP_DIM = { r: 90, g: 96, b: 104 };

const pixel = (png, x, y, color) => {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) * 4;
  png.data[i] = color.r;
  png.data[i + 1] = color.g;
  png.data[i + 2] = color.b;
  png.data[i + 3] = 255;
};

function fillRect(png, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) pixel(png, xx, yy, color);
}

function drawText(png, text, x, y, scale, color) {
  let cursor = x;
  for (const char of text.toUpperCase()) {
    const glyph = FONT[char] ?? FONT[' '];
    for (let row = 0; row < glyph.length; row++)
      for (let col = 0; col < glyph[row].length; col++) {
        if (glyph[row][col] === '1')
          for (let dy = 0; dy < scale; dy++)
            for (let dx = 0; dx < scale; dx++) pixel(png, cursor + col * scale + dx, y + row * scale + dy, color);
      }
    cursor += 4 * scale;
  }
  return cursor;
}

/** Four pips: this action is step 1 of the studio pipeline. */
function drawPips(png, x, y, size, gap, fill, dim) {
  for (let i = 0; i < 4; i++) {
    const px = x + i * (size + gap);
    if (i === 0) fillRect(png, px, y, size, size, fill);
    else {
      fillRect(png, px, y, size, size, dim);
      fillRect(png, px + 1, y + 1, Math.max(1, size - 2), Math.max(1, size - 2), BAR);
    }
  }
}

function upscale(source) {
  const factor = Math.max(1, Math.ceil(128 / Math.min(source.width, source.height)));
  if (factor === 1) return source;
  const output = new PNG({ width: source.width * factor, height: source.height * factor });
  for (let y = 0; y < output.height; y++)
    for (let x = 0; x < output.width; x++) {
      const sx = Math.floor(x / factor),
        sy = Math.floor(y / factor);
      const si = (source.width * sy + sx) * 4,
        di = (output.width * y + x) * 4;
      output.data[di] = source.data[si];
      output.data[di + 1] = source.data[si + 1];
      output.data[di + 2] = source.data[si + 2];
      output.data[di + 3] = source.data[si + 3];
    }
  return output;
}

/** @param {Buffer} input @param {{gate?: string, overall?: number}} score */
export function renderOverlay(input, score = {}) {
  const source = PNG.sync.read(input);
  const png = upscale(source);
  const gate = score.gate ?? 'Review';
  const frame = COLORS[gate] ?? COLORS.Review;
  const thickness = Math.max(2, Math.round(Math.min(png.width, png.height) / 64));
  const scale = Math.max(1, Math.floor(Math.min(png.width, png.height) / 160));
  const barH = 5 * scale + thickness * 3;
  const barY = png.height - thickness - barH;
  fillRect(png, thickness, barY, png.width - thickness * 2, barH, BAR);

  for (let t = 0; t < thickness; t++)
    for (let x = 0; x < png.width; x++) {
      pixel(png, x, t, frame);
      pixel(png, x, png.height - 1 - t, frame);
    }
  for (let t = 0; t < thickness; t++)
    for (let y = 0; y < png.height; y++) {
      pixel(png, t, y, frame);
      pixel(png, png.width - 1 - t, y, frame);
    }

  const short = { Production: 'PROD', Review: 'REVIEW', Reject: 'REJECT' };
  const label = `${short[gate] ?? String(gate).slice(0, 6)} ${Number.isFinite(score.overall) ? Math.round(score.overall) : '?'}`;
  drawText(png, label, thickness * 2, thickness * 2, scale, WHITE);

  const textY = barY + Math.max(1, Math.floor((barH - 5 * scale) / 2));
  const after = drawText(png, 'QC 1/4', thickness * 2, textY, scale, WHITE);
  const pip = Math.max(3, scale * 3);
  drawPips(png, after + scale, textY + Math.floor((5 * scale - pip) / 2), pip, Math.max(2, scale), frame, PIP_DIM);
  return PNG.sync.write(png);
}

export const __test = { upscale };
