// Pure TypeScript QR Code Decoder from ImageData (ISO/IEC 18004)
// Used as a universal fallback on browsers without native BarcodeDetector (e.g. iOS Safari, Firefox)

import type { QRErrorCorrectionLevel } from './qrCode';

type EccSpec = [number, number, number, number, number];

const ECC_TABLE: Record<QRErrorCorrectionLevel, EccSpec[]> = {
  L: [
    [7, 1, 19, 0, 0], [10, 1, 34, 0, 0], [15, 1, 55, 0, 0], [20, 1, 80, 0, 0], [26, 1, 108, 0, 0],
    [18, 2, 68, 0, 0], [20, 2, 78, 0, 0], [24, 2, 97, 0, 0], [30, 2, 116, 0, 0], [18, 2, 68, 2, 69],
    [20, 4, 81, 0, 0], [24, 2, 92, 2, 93], [26, 4, 107, 0, 0], [30, 3, 115, 1, 116], [22, 5, 87, 1, 88],
    [24, 5, 98, 1, 99], [28, 1, 107, 5, 108], [30, 5, 120, 1, 121], [28, 3, 113, 4, 114], [28, 3, 107, 5, 108],
    [28, 4, 116, 4, 117], [28, 2, 111, 7, 112], [30, 4, 121, 5, 122], [30, 6, 117, 4, 118], [26, 8, 106, 4, 107],
    [28, 10, 114, 2, 115], [30, 8, 122, 4, 123], [30, 3, 117, 10, 118], [30, 7, 116, 7, 117], [30, 5, 115, 10, 116],
    [30, 13, 115, 3, 116], [30, 17, 115, 0, 0], [30, 17, 115, 1, 116], [30, 13, 115, 6, 116], [30, 12, 121, 7, 122],
    [30, 6, 121, 14, 122], [30, 17, 122, 4, 123], [30, 4, 122, 18, 123], [30, 20, 117, 4, 118], [30, 19, 118, 6, 119]
  ],
  M: [
    [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
    [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44],
    [30, 1, 50, 4, 51], [22, 6, 36, 2, 37], [22, 8, 37, 1, 38], [24, 4, 40, 5, 41], [24, 5, 41, 5, 42],
    [28, 7, 45, 3, 46], [28, 10, 46, 1, 47], [26, 9, 43, 4, 44], [26, 3, 44, 11, 45], [26, 3, 41, 13, 42],
    [26, 17, 42, 0, 0], [28, 17, 46, 0, 0], [28, 4, 47, 14, 48], [28, 6, 45, 14, 46], [28, 8, 47, 13, 48],
    [28, 19, 46, 4, 47], [28, 22, 45, 3, 46], [28, 3, 45, 23, 46], [28, 21, 45, 7, 46], [28, 19, 47, 10, 48],
    [28, 2, 46, 29, 47], [28, 10, 46, 23, 47], [28, 14, 46, 21, 47], [28, 14, 46, 23, 47], [28, 12, 47, 26, 48],
    [28, 6, 47, 34, 48], [28, 29, 46, 14, 47], [28, 13, 46, 32, 47], [28, 40, 47, 7, 48], [28, 18, 47, 31, 48]
  ],
  Q: [
    [13, 1, 13, 0, 0], [22, 1, 22, 0, 0], [18, 2, 17, 0, 0], [26, 2, 24, 0, 0], [18, 2, 15, 2, 16],
    [24, 4, 19, 0, 0], [18, 2, 14, 4, 15], [22, 4, 18, 2, 19], [20, 4, 16, 4, 17], [24, 6, 19, 2, 20],
    [28, 4, 22, 4, 23], [26, 4, 20, 6, 21], [24, 8, 20, 4, 21], [20, 11, 16, 5, 17], [30, 5, 24, 7, 25],
    [24, 15, 19, 2, 20], [28, 1, 22, 15, 23], [28, 17, 22, 1, 23], [26, 17, 21, 4, 22], [30, 15, 24, 5, 25],
    [28, 17, 22, 6, 23], [30, 7, 24, 16, 25], [30, 11, 24, 14, 25], [30, 11, 24, 16, 25], [30, 7, 24, 22, 25],
    [28, 28, 22, 6, 23], [30, 8, 23, 26, 24], [30, 4, 24, 31, 25], [30, 1, 23, 37, 24], [30, 15, 24, 25, 25],
    [30, 42, 24, 1, 25], [30, 10, 24, 35, 25], [30, 29, 24, 19, 25], [30, 44, 24, 7, 25], [30, 39, 24, 14, 25],
    [30, 46, 24, 10, 25], [30, 49, 24, 10, 25], [30, 48, 24, 14, 25], [30, 43, 24, 22, 25], [30, 34, 24, 34, 25]
  ],
  H: [
    [17, 1, 9, 0, 0], [28, 1, 16, 0, 0], [22, 2, 13, 0, 0], [16, 4, 9, 0, 0], [22, 2, 11, 2, 12],
    [28, 4, 15, 0, 0], [26, 4, 13, 1, 14], [26, 4, 14, 2, 15], [24, 4, 12, 4, 13], [28, 6, 15, 2, 16],
    [24, 3, 12, 8, 13], [28, 7, 14, 4, 15], [22, 12, 11, 4, 12], [24, 11, 12, 5, 13], [24, 11, 12, 7, 13],
    [30, 3, 15, 13, 16], [28, 2, 14, 17, 15], [28, 2, 14, 19, 15], [26, 9, 13, 16, 14], [28, 15, 15, 10, 16],
    [30, 19, 16, 6, 17], [24, 34, 13, 0, 0], [30, 16, 15, 14, 16], [30, 30, 16, 2, 17], [30, 22, 15, 13, 16],
    [30, 33, 16, 4, 17], [30, 12, 15, 28, 16], [30, 11, 15, 31, 16], [30, 19, 15, 26, 16], [30, 23, 15, 25, 16],
    [30, 23, 15, 28, 16], [30, 19, 15, 35, 16], [30, 11, 15, 46, 16], [30, 59, 16, 1, 17], [30, 22, 15, 41, 16],
    [30, 2, 15, 64, 16], [30, 24, 15, 46, 16], [30, 42, 15, 32, 16], [30, 10, 15, 67, 16], [30, 20, 15, 61, 16]
  ]
};

const ALIGNMENT_PATTERNS: number[][] = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46],
  [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74],
  [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]
];

// GF(256) with primitive polynomial 0x11D
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('GF divide by zero');
  if (a === 0) return 0;
  return GF_EXP[(GF_LOG[a] + 255 - GF_LOG[b]) % 255];
}

function polyEval(poly: Uint8Array, x: number): number {
  let y = poly[0];
  for (let i = 1; i < poly.length; i++) {
    y = gfMul(y, x) ^ poly[i];
  }
  return y;
}

// Berlekamp-Massey + Chien + Forney RS decoder over GF(256)
function decodeReedSolomonBlock(block: Uint8Array, ecCount: number): boolean {
  const n = block.length;
  const syndromes = new Uint8Array(ecCount);
  let hasError = false;
  for (let i = 0; i < ecCount; i++) {
    const s = polyEval(block, GF_EXP[i]);
    syndromes[i] = s;
    if (s !== 0) hasError = true;
  }
  if (!hasError) return true;

  // Berlekamp-Massey
  let C: number[] = [1];
  let B: number[] = [1];
  let L = 0;
  let m = 1;
  let b = 1;

  for (let r = 0; r < ecCount; r++) {
    let delta = syndromes[r];
    for (let i = 1; i <= L; i++) {
      delta ^= gfMul(C[i], syndromes[r - i]);
    }
    if (delta === 0) {
      m++;
    } else {
      const T = [...C];
      const coef = gfDiv(delta, b);
      const padded = new Array<number>(m).fill(0).concat(B.map((v) => gfMul(v, coef)));
      const maxLen = Math.max(C.length, padded.length);
      const nextC = new Array<number>(maxLen).fill(0);
      for (let i = 0; i < C.length; i++) nextC[i] ^= C[i];
      for (let i = 0; i < padded.length; i++) nextC[i] ^= padded[i];
      C = nextC;
      if (2 * L <= r) {
        L = r + 1 - L;
        B = T;
        b = delta;
        m = 1;
      } else {
        m++;
      }
    }
  }

  if (L * 2 > ecCount) return false;

  // Chien search: find roots of C (X_k^-1)
  const errPos: number[] = [];
  const xInvList: number[] = [];
  for (let i = 0; i < n; i++) {
    // Position from right is i, X_k = alpha^i, X_k^-1 = alpha^(255 - i)
    const xInv = GF_EXP[(255 - (i % 255)) % 255];
    let sum = 0;
    let xPow = 1;
    for (let j = 0; j < C.length; j++) {
      sum ^= gfMul(C[j], xPow);
      xPow = gfMul(xPow, xInv);
    }
    if (sum === 0) {
      errPos.push(n - 1 - i);
      xInvList.push(xInv);
    }
  }

  if (errPos.length !== L) return false;

  // Error evaluator Omega(x) = (S(x) * C(x)) mod x^ecCount
  const omega = new Uint8Array(ecCount);
  for (let i = 0; i < ecCount; i++) {
    let val = 0;
    for (let j = 0; j <= i && j < C.length; j++) {
      val ^= gfMul(C[j], syndromes[i - j]);
    }
    omega[i] = val;
  }

  // Formal derivative C'(x) (odd terms only in GF(2^m))
  for (let k = 0; k < errPos.length; k++) {
    const xInv = xInvList[k];
    let omegaVal = 0;
    let xPow = 1;
    for (let j = 0; j < ecCount; j++) {
      omegaVal ^= gfMul(omega[j], xPow);
      xPow = gfMul(xPow, xInv);
    }
    let cDeriv = 0;
    let xPow2 = 1;
    const xInv2 = gfMul(xInv, xInv);
    for (let j = 1; j < C.length; j += 2) {
      cDeriv ^= gfMul(C[j], xPow2);
      xPow2 = gfMul(xPow2, xInv2);
    }
    if (cDeriv === 0) return false;
    // With first syndrome at alpha^0, Forney formula is e_k = X_k * Omega(X_k^-1) / C'(X_k^-1)
    const errMag = gfDiv(omegaVal, gfMul(xInv, cDeriv));
    block[errPos[k]] ^= errMag;
  }

  // Re-verify syndromes
  for (let i = 0; i < ecCount; i++) {
    if (polyEval(block, GF_EXP[i]) !== 0) return false;
  }
  return true;
}

function popcount(n: number): number {
  let c = 0;
  while (n) {
    c += n & 1;
    n >>= 1;
  }
  return c;
}

const VALID_FORMAT_INFOS: { bits: number; level: QRErrorCorrectionLevel; mask: number }[] = (() => {
  const levels: { bits: number; level: QRErrorCorrectionLevel }[] = [
    { bits: 1, level: 'L' },
    { bits: 0, level: 'M' },
    { bits: 3, level: 'Q' },
    { bits: 2, level: 'H' }
  ];
  const out: { bits: number; level: QRErrorCorrectionLevel; mask: number }[] = [];
  for (const l of levels) {
    for (let mask = 0; mask < 8; mask++) {
      const data = (l.bits << 3) | mask;
      let rem = data << 10;
      for (let i = 14; i >= 10; i--) {
        if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
      }
      out.push({ bits: ((data << 10) | rem) ^ 0x5412, level: l.level, mask });
    }
  }
  return out;
})();

function decodeFormatInfo(raw1: number, raw2: number): { level: QRErrorCorrectionLevel; mask: number } | null {
  let bestDist = Infinity;
  let best: { level: QRErrorCorrectionLevel; mask: number } | null = null;
  for (const entry of VALID_FORMAT_INFOS) {
    const d1 = popcount(raw1 ^ entry.bits);
    const d2 = popcount(raw2 ^ entry.bits);
    const d = Math.min(d1, d2);
    if (d < bestDist) {
      bestDist = d;
      best = { level: entry.level, mask: entry.mask };
    }
  }
  return bestDist <= 3 ? best : null;
}

const VALID_VERSION_INFOS: { version: number; bits: number }[] = (() => {
  const out: { version: number; bits: number }[] = [];
  for (let v = 7; v <= 40; v++) {
    let rem = v << 12;
    for (let i = 17; i >= 12; i--) {
      if ((rem >> i) & 1) rem ^= 0x1f25 << (i - 12);
    }
    out.push({ version: v, bits: (v << 12) | rem });
  }
  return out;
})();

function decodeVersionInfo(raw1: number, raw2: number): number | null {
  let bestDist = Infinity;
  let bestVer: number | null = null;
  for (const entry of VALID_VERSION_INFOS) {
    const d = Math.min(popcount(raw1 ^ entry.bits), popcount(raw2 ^ entry.bits));
    if (d < bestDist) {
      bestDist = d;
      bestVer = entry.version;
    }
  }
  return bestDist <= 3 ? bestVer : null;
}

function buildFunctionMask(size: number, version: number): boolean[][] {
  const fn = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const markRect = (r0: number, c0: number, h: number, w: number) => {
    for (let r = r0; r < r0 + h; r++) {
      for (let c = c0; c < c0 + w; c++) {
        if (r >= 0 && r < size && c >= 0 && c < size) fn[r][c] = true;
      }
    }
  };
  // Finders + separators + format
  markRect(0, 0, 9, 9);
  markRect(0, size - 8, 9, 8);
  markRect(size - 8, 0, 8, 9);
  // Timing
  for (let i = 8; i < size - 8; i++) {
    fn[6][i] = true;
    fn[i][6] = true;
  }
  // Alignment
  const coords = ALIGNMENT_PATTERNS[version] || [];
  for (let i = 0; i < coords.length; i++) {
    for (let j = 0; j < coords.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === coords.length - 1) ||
        (i === coords.length - 1 && j === 0)
      ) {
        continue;
      }
      markRect(coords[i] - 2, coords[j] - 2, 5, 5);
    }
  }
  // Version
  if (version >= 7) {
    markRect(0, size - 11, 6, 3);
    markRect(size - 11, 0, 3, 6);
  }
  return fn;
}

function shouldMask(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    default: return false;
  }
}

function decodeBitStream(dataBytes: Uint8Array, version: number): string | null {
  let bitOffset = 0;
  const totalBits = dataBytes.length * 8;
  const readBits = (count: number): number => {
    if (bitOffset + count > totalBits) throw new Error('EOF');
    let val = 0;
    for (let i = 0; i < count; i++) {
      val = (val << 1) | ((dataBytes[bitOffset >> 3] >> (7 - (bitOffset & 7))) & 1);
      bitOffset++;
    }
    return val;
  };

  const chunks: Uint8Array[] = [];
  const textDecoder = new TextDecoder('utf-8', { fatal: false });
  const pushStr = (s: string) => chunks.push(new TextEncoder().encode(s));

  try {
    while (totalBits - bitOffset >= 4) {
      const mode = readBits(4);
      if (mode === 0) break; // Terminator

      if (mode === 0b0111) {
        // ECI
        const first = readBits(8);
        if ((first & 0x80) !== 0) {
          if ((first & 0xc0) === 0x80) readBits(8);
          else if ((first & 0xe0) === 0xc0) readBits(16);
        }
        continue;
      }

      if (mode === 0b0100) {
        // Byte
        const countBits = version <= 9 ? 8 : 16;
        const count = readBits(countBits);
        const bytes = new Uint8Array(count);
        for (let i = 0; i < count; i++) bytes[i] = readBits(8);
        chunks.push(bytes);
      } else if (mode === 0b0010) {
        // Alphanumeric
        const TABLE = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
        const countBits = version <= 9 ? 9 : version <= 26 ? 11 : 13;
        let count = readBits(countBits);
        let s = '';
        while (count >= 2) {
          const v = readBits(11);
          s += TABLE[Math.floor(v / 45)] + TABLE[v % 45];
          count -= 2;
        }
        if (count === 1) s += TABLE[readBits(6)];
        pushStr(s);
      } else if (mode === 0b0001) {
        // Numeric
        const countBits = version <= 9 ? 10 : version <= 26 ? 12 : 14;
        let count = readBits(countBits);
        let s = '';
        while (count >= 3) {
          s += String(readBits(10)).padStart(3, '0');
          count -= 3;
        }
        if (count === 2) s += String(readBits(7)).padStart(2, '0');
        else if (count === 1) s += String(readBits(4));
        pushStr(s);
      } else {
        return null;
      }
    }
  } catch {
    return null;
  }

  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const merged = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    merged.set(c, pos);
    pos += c.length;
  }
  return textDecoder.decode(merged);
}

function decodeMatrix(matrix: boolean[][]): string | null {
  const size = matrix.length;
  if (size < 21 || (size - 17) % 4 !== 0) return null;
  let version = (size - 17) / 4;
  if (version < 1 || version > 40) return null;

  if (version >= 7) {
    let v1 = 0;
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        v1 = (v1 << 1) | (matrix[5 - i][size - 9 - j] ? 1 : 0);
      }
    }
    let v2 = 0;
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        v2 = (v2 << 1) | (matrix[size - 9 - j][5 - i] ? 1 : 0);
      }
    }
    const decodedVer = decodeVersionInfo(v1, v2);
    if (decodedVer) version = decodedVer;
  }

  // Read format info 1 (around TL finder)
  let f1 = 0;
  for (let i = 0; i <= 5; i++) f1 = (f1 << 1) | (matrix[i][8] ? 1 : 0);
  f1 = (f1 << 1) | (matrix[7][8] ? 1 : 0);
  f1 = (f1 << 1) | (matrix[8][8] ? 1 : 0);
  f1 = (f1 << 1) | (matrix[8][7] ? 1 : 0);
  for (let i = 5; i >= 0; i--) f1 = (f1 << 1) | (matrix[8][i] ? 1 : 0);

  // Read format info 2 (TR & BL)
  let f2 = 0;
  for (let i = size - 1; i >= size - 7; i--) f2 = (f2 << 1) | (matrix[8][i] ? 1 : 0);
  for (let i = size - 8; i < size; i++) f2 = (f2 << 1) | (matrix[i][8] ? 1 : 0);

  // Wait: order of bits in f1/f2 above: MSB is bit 14, LSB is bit 0
  // Let's double check: in encoder:
  // bit 0..5 at (8, 0..5), bit 6 at (8,7), bit 7 at (8,8), bit 8 at (7,8), bit 9..14 at (5..0, 8)
  // So MSB (14) is (0,8), LSB (0) is (8,0)!
  // In f1 loop: i=0..5 -> (0,8)..(5,8) (bits 14..9), then (7,8) (bit 8), (8,8) (bit 7), (8,7) (bit 6), then (8,5)..(8,0) (bits 5..0). Exact match!
  // In f2: in encoder, bits 0..7 at (size-1-i, 8), bits 8..14 at (8, size-15+i).
  // So MSB (bit 14) is (8, size-1), bit 8 is (8, size-7), bit 7 is (size-8, 8), LSB (bit 0) is (size-1, 8)!
  // Let's check f2 loop: (8, size-1)..(8, size-7) -> bits 14..8; then (size-8, 8)..(size-1, 8) -> bits 7..0. Exact match!

  const fmt = decodeFormatInfo(f1, f2);
  if (!fmt) return null;

  const isFn = buildFunctionMask(size, version);
  const codewords: number[] = [];
  let currentByte = 0;
  let bitsRead = 0;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        if (!isFn[r][c]) {
          const bit = matrix[r][c] !== shouldMask(fmt.mask, r, c) ? 1 : 0;
          currentByte = (currentByte << 1) | bit;
          bitsRead++;
          if (bitsRead === 8) {
            codewords.push(currentByte);
            currentByte = 0;
            bitsRead = 0;
          }
        }
      }
    }
    upward = !upward;
  }

  const [ecCount, g1b, g1d, g2b, g2d] = ECC_TABLE[fmt.level][version - 1];
  const totalBlocks = g1b + g2b;
  const totalData = g1b * g1d + g2b * g2d;
  const totalCW = totalData + ecCount * totalBlocks;
  if (codewords.length < totalCW) return null;

  const blocks: Uint8Array[] = [];
  for (let i = 0; i < g1b; i++) blocks.push(new Uint8Array(g1d + ecCount));
  for (let i = 0; i < g2b; i++) blocks.push(new Uint8Array(g2d + ecCount));

  let idx = 0;
  const maxData = Math.max(g1d, g2d);
  for (let i = 0; i < maxData; i++) {
    for (let b = 0; b < totalBlocks; b++) {
      const dLen = b < g1b ? g1d : g2d;
      if (i < dLen) blocks[b][i] = codewords[idx++];
    }
  }
  for (let i = 0; i < ecCount; i++) {
    for (let b = 0; b < totalBlocks; b++) {
      const dLen = b < g1b ? g1d : g2d;
      blocks[b][dLen + i] = codewords[idx++];
    }
  }

  const dataOut = new Uint8Array(totalData);
  let outPos = 0;
  for (let b = 0; b < totalBlocks; b++) {
    if (!decodeReedSolomonBlock(blocks[b], ecCount)) return null;
    const dLen = b < g1b ? g1d : g2d;
    dataOut.set(blocks[b].subarray(0, dLen), outPos);
    outPos += dLen;
  }

  return decodeBitStream(dataOut, version);
}

// --- Image Binarization & Finder Localization ---

function binarizeAdaptive(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const lum = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
    lum[i] = (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29) >> 8;
  }

  const blockSize = 8;
  const blocksX = Math.ceil(width / blockSize);
  const blocksY = Math.ceil(height / blockSize);
  const blockMin = new Uint8Array(blocksX * blocksY);
  const blockMax = new Uint8Array(blocksX * blocksY);
  const blockAvg = new Uint8Array(blocksX * blocksY);

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      let min = 255;
      let max = 0;
      let sum = 0;
      let count = 0;
      const yEnd = Math.min(height, (by + 1) * blockSize);
      const xEnd = Math.min(width, (bx + 1) * blockSize);
      for (let y = by * blockSize; y < yEnd; y++) {
        const row = y * width;
        for (let x = bx * blockSize; x < xEnd; x++) {
          const v = lum[row + x];
          if (v < min) min = v;
          if (v > max) max = v;
          sum += v;
          count++;
        }
      }
      const bi = by * blocksX + bx;
      blockMin[bi] = min;
      blockMax[bi] = max;
      blockAvg[bi] = Math.round(sum / Math.max(1, count));
    }
  }

  const bin = new Uint8Array(width * height);
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const bi = by * blocksX + bx;
      let thresh: number;
      if (blockMax[bi] - blockMin[bi] > 24) {
        let sum = 0;
        let cnt = 0;
        for (let dy = -2; dy <= 2; dy++) {
          const ny = Math.min(blocksY - 1, Math.max(0, by + dy));
          for (let dx = -2; dx <= 2; dx++) {
            const nx = Math.min(blocksX - 1, Math.max(0, bx + dx));
            sum += blockAvg[ny * blocksX + nx];
            cnt++;
          }
        }
        thresh = sum / cnt;
      } else {
        thresh = blockMin[bi] / 2 + 64;
      }

      const yEnd = Math.min(height, (by + 1) * blockSize);
      const xEnd = Math.min(width, (bx + 1) * blockSize);
      for (let y = by * blockSize; y < yEnd; y++) {
        const row = y * width;
        for (let x = bx * blockSize; x < xEnd; x++) {
          bin[row + x] = lum[row + x] < thresh ? 1 : 0;
        }
      }
    }
  }
  return bin;
}

interface FinderCenter {
  x: number;
  y: number;
  moduleSize: number;
  count: number;
}

function checkRatio(counts: number[]): number | null {
  const total = counts[0] + counts[1] + counts[2] + counts[3] + counts[4];
  if (total < 7) return null;
  const mod = total / 7;
  const maxVar = mod * 0.55;
  if (
    Math.abs(mod - counts[0]) < maxVar &&
    Math.abs(mod - counts[1]) < maxVar &&
    Math.abs(3 * mod - counts[2]) < 3 * maxVar &&
    Math.abs(mod - counts[3]) < maxVar &&
    Math.abs(mod - counts[4]) < maxVar
  ) {
    return mod;
  }
  return null;
}

function crossCheckVertical(
  bin: Uint8Array,
  w: number,
  h: number,
  cx: number,
  startY: number,
  maxCenterCount: number,
  origTotal: number
): { y: number; mod: number } | null {
  const counts = [0, 0, 0, 0, 0];
  let y = startY;
  while (y >= 0 && bin[y * w + cx] === 1) {
    counts[2]++;
    y--;
  }
  if (y < 0) return null;
  while (y >= 0 && bin[y * w + cx] === 0 && counts[1] <= maxCenterCount) {
    counts[1]++;
    y--;
  }
  if (y < 0 || counts[1] > maxCenterCount) return null;
  while (y >= 0 && bin[y * w + cx] === 1 && counts[0] <= maxCenterCount) {
    counts[0]++;
    y--;
  }
  if (counts[0] > maxCenterCount) return null;

  y = startY + 1;
  while (y < h && bin[y * w + cx] === 1) {
    counts[2]++;
    y++;
  }
  if (y >= h) return null;
  while (y < h && bin[y * w + cx] === 0 && counts[3] <= maxCenterCount) {
    counts[3]++;
    y++;
  }
  if (y >= h || counts[3] > maxCenterCount) return null;
  while (y < h && bin[y * w + cx] === 1 && counts[4] <= maxCenterCount) {
    counts[4]++;
    y++;
  }
  if (counts[4] > maxCenterCount) return null;

  const total = counts[0] + counts[1] + counts[2] + counts[3] + counts[4];
  if (5 * Math.abs(total - origTotal) >= 2 * origTotal) return null;
  const mod = checkRatio(counts);
  if (!mod) return null;
  return { y: y - counts[4] - counts[3] - counts[2] / 2, mod };
}

function crossCheckHorizontal(
  bin: Uint8Array,
  w: number,
  h: number,
  startX: number,
  cy: number,
  maxCenterCount: number,
  origTotal: number
): { x: number; mod: number } | null {
  if (cy < 0 || cy >= h) return null;
  const row = cy * w;
  const counts = [0, 0, 0, 0, 0];
  let x = startX;
  while (x >= 0 && bin[row + x] === 1) {
    counts[2]++;
    x--;
  }
  if (x < 0) return null;
  while (x >= 0 && bin[row + x] === 0 && counts[1] <= maxCenterCount) {
    counts[1]++;
    x--;
  }
  if (x < 0 || counts[1] > maxCenterCount) return null;
  while (x >= 0 && bin[row + x] === 1 && counts[0] <= maxCenterCount) {
    counts[0]++;
    x--;
  }
  if (counts[0] > maxCenterCount) return null;

  x = startX + 1;
  while (x < w && bin[row + x] === 1) {
    counts[2]++;
    x++;
  }
  if (x >= w) return null;
  while (x < w && bin[row + x] === 0 && counts[3] <= maxCenterCount) {
    counts[3]++;
    x++;
  }
  if (x >= w || counts[3] > maxCenterCount) return null;
  while (x < w && bin[row + x] === 1 && counts[4] <= maxCenterCount) {
    counts[4]++;
    x++;
  }
  if (counts[4] > maxCenterCount) return null;

  const total = counts[0] + counts[1] + counts[2] + counts[3] + counts[4];
  if (5 * Math.abs(total - origTotal) >= origTotal) return null;
  const mod = checkRatio(counts);
  if (!mod) return null;
  return { x: x - counts[4] - counts[3] - counts[2] / 2, mod };
}

function findFinderPatterns(bin: Uint8Array, w: number, h: number): FinderCenter[] {
  const centers: FinderCenter[] = [];
  const rowSkip = Math.max(1, Math.min(3, Math.floor(h / 200)));

  for (let y = rowSkip - 1; y < h; y += rowSkip) {
    const counts = [0, 0, 0, 0, 0];
    let state = 0;
    const row = y * w;

    for (let x = 0; x < w; x++) {
      if (bin[row + x] === 1) {
        if ((state & 1) === 1) state++;
        counts[state]++;
      } else {
        if ((state & 1) === 0) {
          if (state === 4) {
            const hMod = checkRatio(counts);
            if (hMod !== null) {
              const total = counts[0] + counts[1] + counts[2] + counts[3] + counts[4];
              const cx = Math.round(x - counts[4] - counts[3] - counts[2] / 2);
              const vCheck = crossCheckVertical(bin, w, h, cx, y, counts[2], total);
              if (vCheck) {
                const hCheck = crossCheckHorizontal(bin, w, h, cx, Math.round(vCheck.y), counts[2], total);
                if (hCheck) {
                  const modSize = (hMod + vCheck.mod + hCheck.mod) / 3;
                  let merged = false;
                  for (const c of centers) {
                    if (
                      Math.abs(c.x - hCheck.x) <= modSize * 2 &&
                      Math.abs(c.y - vCheck.y) <= modSize * 2 &&
                      Math.abs(c.moduleSize - modSize) <= Math.max(1, modSize * 0.5)
                    ) {
                      const n = c.count + 1;
                      c.x = (c.x * c.count + hCheck.x) / n;
                      c.y = (c.y * c.count + vCheck.y) / n;
                      c.moduleSize = (c.moduleSize * c.count + modSize) / n;
                      c.count = n;
                      merged = true;
                      break;
                    }
                  }
                  if (!merged) {
                    centers.push({ x: hCheck.x, y: vCheck.y, moduleSize: modSize, count: 1 });
                  }
                }
              }
            }
            counts[0] = counts[2];
            counts[1] = counts[3];
            counts[2] = counts[4];
            counts[3] = 1;
            counts[4] = 0;
            state = 3;
          } else {
            counts[++state]++;
          }
        } else {
          counts[state]++;
        }
      }
    }
  }

  return centers.sort((a, b) => b.count - a.count);
}

function solveHomography(
  src: [number, number][],
  dst: [number, number][]
): number[] | null {
  // 8x8 Gaussian elimination mapping (u,v) -> (x,y)
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = src[i];
    const [x, y] = dst[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }

  const n = 8;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
    }
    if (Math.abs(A[pivot][col]) < 1e-10) return null;
    [A[col], A[pivot]] = [A[pivot], A[col]];
    [b[col], b[pivot]] = [b[pivot], b[col]];

    const div = A[col][col];
    for (let j = col; j < n; j++) A[col][j] /= div;
    b[col] /= div;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = A[r][col];
      for (let j = col; j < n; j++) A[r][j] -= factor * A[col][j];
      b[r] -= factor * b[col];
    }
  }
  return [...b, 1];
}

function findAlignmentPattern(
  bin: Uint8Array,
  w: number,
  h: number,
  estX: number,
  estY: number,
  modSize: number
): { x: number; y: number } | null {
  const radius = Math.max(8, Math.round(modSize * 6));
  const x0 = Math.max(0, Math.round(estX - radius));
  const x1 = Math.min(w - 1, Math.round(estX + radius));
  const y0 = Math.max(0, Math.round(estY - radius));
  const y1 = Math.min(h - 1, Math.round(estY + radius));

  const checkAlign = (counts: number[]) => {
    const total = counts[0] + counts[1] + counts[2];
    if (total < 3) return false;
    const mod = total / 3;
    return (
      Math.abs(counts[0] - mod) < mod * 0.6 &&
      Math.abs(counts[1] - mod) < mod * 0.6 &&
      Math.abs(counts[2] - mod) < mod * 0.6 &&
      Math.abs(mod - modSize) < modSize * 0.6
    );
  };

  for (let dy = 0; dy <= radius; dy++) {
    for (const sign of dy === 0 ? [1] : [1, -1]) {
      const y = Math.round(estY + dy * sign);
      if (y < y0 || y > y1) continue;
      const row = y * w;
      const counts = [0, 0, 0];
      let state = 0;
      for (let x = x0; x <= x1; x++) {
        const isBlack = bin[row + x] === 1;
        if (state === 0) {
          if (!isBlack) counts[0]++;
          else if (counts[0] > 0) {
            state = 1;
            counts[1] = 1;
          }
        } else if (state === 1) {
          if (isBlack) counts[1]++;
          else {
            state = 2;
            counts[2] = 1;
          }
        } else {
          if (!isBlack) counts[2]++;
          else {
            if (checkAlign(counts)) {
              const cx = Math.round(x - counts[2] - counts[1] / 2);
              // Vertical check
              let top = y;
              while (top >= y0 && bin[top * w + cx] === 1) top--;
              let bot = y;
              while (bot <= y1 && bin[bot * w + cx] === 1) bot++;
              if (bot - top - 1 > 0 && Math.abs(bot - top - 1 - modSize) < modSize * 0.9) {
                return { x: cx, y: (top + bot) / 2 };
              }
            }
            counts[0] = counts[2];
            counts[1] = 1;
            counts[2] = 0;
            state = 1;
          }
        }
      }
    }
  }
  return null;
}

function tryDecodeTriple(
  bin: Uint8Array,
  w: number,
  h: number,
  a: FinderCenter,
  b: FinderCenter,
  c: FinderCenter
): string | null {
  const dAB = Math.hypot(a.x - b.x, a.y - b.y);
  const dAC = Math.hypot(a.x - c.x, a.y - c.y);
  const dBC = Math.hypot(b.x - c.x, b.y - c.y);

  let tl: FinderCenter, p1: FinderCenter, p2: FinderCenter;
  if (dBC >= dAB && dBC >= dAC) {
    tl = a;
    p1 = b;
    p2 = c;
  } else if (dAC >= dAB && dAC >= dBC) {
    tl = b;
    p1 = a;
    p2 = c;
  } else {
    tl = c;
    p1 = a;
    p2 = b;
  }

  // Cross product (p1 - tl) x (p2 - tl): if < 0 then p1 is BL and p2 is TR
  const cross = (p1.x - tl.x) * (p2.y - tl.y) - (p2.x - tl.x) * (p1.y - tl.y);
  const tr = cross > 0 ? p1 : p2;
  const bl = cross > 0 ? p2 : p1;

  const modSize = (tl.moduleSize + tr.moduleSize + bl.moduleSize) / 3;
  if (modSize < 1) return null;

  const dTop = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const dLeft = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rawDim = Math.round(((dTop + dLeft) / 2) / modSize) + 7;

  // Try snapped dimension and +/- 4 neighbor versions
  const baseVer = Math.max(1, Math.min(40, Math.round((rawDim - 17) / 4)));
  const candidateVersions = [baseVer];
  if (baseVer > 1) candidateVersions.push(baseVer - 1);
  if (baseVer < 40) candidateVersions.push(baseVer + 1);

  for (const ver of candidateVersions) {
    const dim = ver * 4 + 17;
    let H: number[] | null = null;

    if (ver >= 2) {
      const estX = tr.x + bl.x - tl.x - (3 * (tr.x - tl.x + bl.x - tl.x)) / (dim - 7);
      const estY = tr.y + bl.y - tl.y - (3 * (tr.y - tl.y + bl.y - tl.y)) / (dim - 7);
      const align = findAlignmentPattern(bin, w, h, estX, estY, modSize);
      if (align) {
        H = solveHomography(
          [
            [3.5, 3.5],
            [dim - 3.5, 3.5],
            [3.5, dim - 3.5],
            [dim - 6.5, dim - 6.5]
          ],
          [
            [tl.x, tl.y],
            [tr.x, tr.y],
            [bl.x, bl.y],
            [align.x, align.y]
          ]
        );
      }
    }

    if (!H) {
      const brX = tr.x + bl.x - tl.x;
      const brY = tr.y + bl.y - tl.y;
      H = solveHomography(
        [
          [3.5, 3.5],
          [dim - 3.5, 3.5],
          [3.5, dim - 3.5],
          [dim - 3.5, dim - 3.5]
        ],
        [
          [tl.x, tl.y],
          [tr.x, tr.y],
          [bl.x, bl.y],
          [brX, brY]
        ]
      );
    }

    if (!H) continue;

    const matrix: boolean[][] = Array.from({ length: dim }, () => Array<boolean>(dim).fill(false));
    for (let r = 0; r < dim; r++) {
      const v = r + 0.5;
      for (let col = 0; col < dim; col++) {
        const u = col + 0.5;
        const denom = H[6] * u + H[7] * v + H[8];
        if (Math.abs(denom) < 1e-8) continue;
        const px = Math.round((H[0] * u + H[1] * v + H[2]) / denom);
        const py = Math.round((H[3] * u + H[4] * v + H[5]) / denom);
        if (px >= 0 && px < w && py >= 0 && py < h) {
          matrix[r][col] = bin[py * w + px] === 1;
        }
      }
    }

    const decoded = decodeMatrix(matrix);
    if (decoded !== null) return decoded;
  }

  return null;
}

export function decodeQRCodeFromImageData(imageData: ImageData): string | null {
  const { data, width, height } = imageData;
  if (width < 21 || height < 21) return null;

  const bin = binarizeAdaptive(data, width, height);
  const finders = findFinderPatterns(bin, width, height);
  if (finders.length < 3) return null;

  const limit = Math.min(finders.length, 6);
  for (let i = 0; i < limit; i++) {
    for (let j = i + 1; j < limit; j++) {
      for (let k = j + 1; k < limit; k++) {
        const res = tryDecodeTriple(bin, width, height, finders[i], finders[j], finders[k]);
        if (res !== null) return res;
      }
    }
  }
  return null;
}
