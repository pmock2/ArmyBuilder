// Pure TypeScript QR Code Encoder (ISO/IEC 18004, Versions 1-40, Byte mode UTF-8)

export type QRErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QRCodeResult {
  version: number;
  size: number;
  eccLevel: QRErrorCorrectionLevel;
  modules: boolean[][]; // true = dark module
}

// ECC table: [ecCodewordsPerBlock, group1Blocks, group1DataCW, group2Blocks, group2DataCW]
// Indexed by version 1..40
type EccSpec = [number, number, number, number, number];

const ECC_TABLE: Record<QRErrorCorrectionLevel, EccSpec[]> = {
  L: [
    // v1-v5
    [7, 1, 19, 0, 0],
    [10, 1, 34, 0, 0],
    [15, 1, 55, 0, 0],
    [20, 1, 80, 0, 0],
    [26, 1, 108, 0, 0],
    // v6-v10
    [18, 2, 68, 0, 0],
    [20, 2, 78, 0, 0],
    [24, 2, 97, 0, 0],
    [30, 2, 116, 0, 0],
    [18, 2, 68, 2, 69],
    // v11-v15
    [20, 4, 81, 0, 0],
    [24, 2, 92, 2, 93],
    [26, 4, 107, 0, 0],
    [30, 3, 115, 1, 116],
    [22, 5, 87, 1, 88],
    // v16-v20
    [24, 5, 98, 1, 99],
    [28, 1, 107, 5, 108],
    [30, 5, 120, 1, 121],
    [28, 3, 113, 4, 114],
    [28, 3, 107, 5, 108],
    // v21-v25
    [28, 4, 116, 4, 117],
    [28, 2, 111, 7, 112],
    [30, 4, 121, 5, 122],
    [30, 6, 117, 4, 118],
    [26, 8, 106, 4, 107],
    // v26-v30
    [28, 10, 114, 2, 115],
    [30, 8, 122, 4, 123],
    [30, 3, 117, 10, 118],
    [30, 7, 116, 7, 117],
    [30, 5, 115, 10, 116],
    // v31-v35
    [30, 13, 115, 3, 116],
    [30, 17, 115, 0, 0],
    [30, 17, 115, 1, 116],
    [30, 13, 115, 6, 116],
    [30, 12, 121, 7, 122],
    // v36-v40
    [30, 6, 121, 14, 122],
    [30, 17, 122, 4, 123],
    [30, 4, 122, 18, 123],
    [30, 20, 117, 4, 118],
    [30, 19, 118, 6, 119]
  ],
  M: [
    // v1-v5
    [10, 1, 16, 0, 0],
    [16, 1, 28, 0, 0],
    [26, 1, 44, 0, 0],
    [18, 2, 32, 0, 0],
    [24, 2, 43, 0, 0],
    // v6-v10
    [16, 4, 27, 0, 0],
    [18, 4, 31, 0, 0],
    [22, 2, 38, 2, 39],
    [22, 3, 36, 2, 37],
    [26, 4, 43, 1, 44],
    // v11-v15
    [30, 1, 50, 4, 51],
    [22, 6, 36, 2, 37],
    [22, 8, 37, 1, 38],
    [24, 4, 40, 5, 41],
    [24, 5, 41, 5, 42],
    // v16-v20
    [28, 7, 45, 3, 46],
    [28, 10, 46, 1, 47],
    [26, 9, 43, 4, 44],
    [26, 3, 44, 11, 45],
    [26, 3, 41, 13, 42],
    // v21-v25
    [26, 17, 42, 0, 0],
    [28, 17, 46, 0, 0],
    [28, 4, 47, 14, 48],
    [28, 6, 45, 14, 46],
    [28, 8, 47, 13, 48],
    // v26-v30
    [28, 19, 46, 4, 47],
    [28, 22, 45, 3, 46],
    [28, 3, 45, 23, 46],
    [28, 21, 45, 7, 46],
    [28, 19, 47, 10, 48],
    // v31-v35
    [28, 2, 46, 29, 47],
    [28, 10, 46, 23, 47],
    [28, 14, 46, 21, 47],
    [28, 14, 46, 23, 47],
    [28, 12, 47, 26, 48],
    // v36-v40
    [28, 6, 47, 34, 48],
    [28, 29, 46, 14, 47],
    [28, 13, 46, 32, 47],
    [28, 40, 47, 7, 48],
    [28, 18, 47, 31, 48]
  ],
  Q: [
    // v1-v5
    [13, 1, 13, 0, 0],
    [22, 1, 22, 0, 0],
    [18, 2, 17, 0, 0],
    [26, 2, 24, 0, 0],
    [18, 2, 15, 2, 16],
    // v6-v10
    [24, 4, 19, 0, 0],
    [18, 2, 14, 4, 15],
    [22, 4, 18, 2, 19],
    [20, 4, 16, 4, 17],
    [24, 6, 19, 2, 20],
    // v11-v15
    [28, 4, 22, 4, 23],
    [26, 4, 20, 6, 21],
    [24, 8, 20, 4, 21],
    [20, 11, 16, 5, 17],
    [30, 5, 24, 7, 25],
    // v16-v20
    [24, 15, 19, 2, 20],
    [28, 1, 22, 15, 23],
    [28, 17, 22, 1, 23],
    [26, 17, 21, 4, 22],
    [30, 15, 24, 5, 25],
    // v21-v25
    [28, 17, 22, 6, 23],
    [30, 7, 24, 16, 25],
    [30, 11, 24, 14, 25],
    [30, 11, 24, 16, 25],
    [30, 7, 24, 22, 25],
    // v26-v30
    [28, 28, 22, 6, 23],
    [30, 8, 23, 26, 24],
    [30, 4, 24, 31, 25],
    [30, 1, 23, 37, 24],
    [30, 15, 24, 25, 25],
    // v31-v35
    [30, 42, 24, 1, 25],
    [30, 10, 24, 35, 25],
    [30, 29, 24, 19, 25],
    [30, 44, 24, 7, 25],
    [30, 39, 24, 14, 25],
    // v36-v40
    [30, 46, 24, 10, 25],
    [30, 49, 24, 10, 25],
    [30, 48, 24, 14, 25],
    [30, 43, 24, 22, 25],
    [30, 34, 24, 34, 25]
  ],
  H: [
    // v1-v5
    [17, 1, 9, 0, 0],
    [28, 1, 16, 0, 0],
    [22, 2, 13, 0, 0],
    [16, 4, 9, 0, 0],
    [22, 2, 11, 2, 12],
    // v6-v10
    [28, 4, 15, 0, 0],
    [26, 4, 13, 1, 14],
    [26, 4, 14, 2, 15],
    [24, 4, 12, 4, 13],
    [28, 6, 15, 2, 16],
    // v11-v15
    [24, 3, 12, 8, 13],
    [28, 7, 14, 4, 15],
    [22, 12, 11, 4, 12],
    [24, 11, 12, 5, 13],
    [24, 11, 12, 7, 13],
    // v16-v20
    [30, 3, 15, 13, 16],
    [28, 2, 14, 17, 15],
    [28, 2, 14, 19, 15],
    [26, 9, 13, 16, 14],
    [28, 15, 15, 10, 16],
    // v21-v25
    [30, 19, 16, 6, 17],
    [24, 34, 13, 0, 0],
    [30, 16, 15, 14, 16],
    [30, 30, 16, 2, 17],
    [30, 22, 15, 13, 16],
    // v26-v30
    [30, 33, 16, 4, 17],
    [30, 12, 15, 28, 16],
    [30, 11, 15, 31, 16],
    [30, 19, 15, 26, 16],
    [30, 23, 15, 25, 16],
    // v31-v35
    [30, 23, 15, 28, 16],
    [30, 19, 15, 35, 16],
    [30, 11, 15, 46, 16],
    [30, 59, 16, 1, 17],
    [30, 22, 15, 41, 16],
    // v36-v40
    [30, 2, 15, 64, 16],
    [30, 24, 15, 46, 16],
    [30, 42, 15, 32, 16],
    [30, 10, 15, 67, 16],
    [30, 20, 15, 61, 16]
  ]
};

const ALIGNMENT_PATTERNS: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170]
];

// GF(256) arithmetic with primitive polynomial 0x11D (x^8 + x^4 + x^3 + x^2 + 1)
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
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function getReedSolomonGenerator(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomonECC(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = getReedSolomonGenerator(ecCount);
  const res = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    res.copyWithin(0, 1);
    res[ecCount - 1] = 0;
    for (let j = 0; j < ecCount; j++) {
      res[j] ^= gfMul(gen[j + 1], factor);
    }
  }
  return res;
}

function getFormatInfoBits(eccLevel: QRErrorCorrectionLevel, maskPattern: number): number {
  const eccBitsMap: Record<QRErrorCorrectionLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };
  const data = (eccBitsMap[eccLevel] << 3) | maskPattern;
  let rem = data << 10;
  const poly = 0x537;
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) {
      rem ^= poly << (i - 10);
    }
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function getVersionInfoBits(version: number): number {
  let rem = version << 12;
  const poly = 0x1f25;
  for (let i = 17; i >= 12; i--) {
    if ((rem >> i) & 1) {
      rem ^= poly << (i - 12);
    }
  }
  return (version << 12) | rem;
}

function getTotalDataBytes(version: number, level: QRErrorCorrectionLevel): number {
  const [, g1b, g1d, g2b, g2d] = ECC_TABLE[level][version - 1];
  return g1b * g1d + g2b * g2d;
}

function selectVersionAndLevel(
  byteLen: number,
  preferredLevel: QRErrorCorrectionLevel
): { version: number; level: QRErrorCorrectionLevel } {
  const levels: QRErrorCorrectionLevel[] =
    preferredLevel === 'H'
      ? ['H', 'Q', 'M', 'L']
      : preferredLevel === 'Q'
      ? ['Q', 'M', 'L']
      : preferredLevel === 'M'
      ? ['M', 'L']
      : ['L'];

  // First try preferred level across v1..40, then fall back to lower ECC if too large
  for (const level of levels) {
    for (let v = 1; v <= 40; v++) {
      const charCountBits = v <= 9 ? 8 : 16;
      const totalDataBits = getTotalDataBytes(v, level) * 8;
      const neededBits = 4 + charCountBits + byteLen * 8;
      if (neededBits <= totalDataBits) {
        return { version: v, level };
      }
    }
  }

  throw new Error('Data is too large to fit inside a QR code.');
}

function encodeDataCodewords(bytes: Uint8Array, version: number, level: QRErrorCorrectionLevel): Uint8Array {
  const totalDataBytes = getTotalDataBytes(version, level);
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  // Mode: Byte (0100)
  pushBits(0b0100, 4);
  // Character count
  pushBits(bytes.length, version <= 9 ? 8 : 16);
  // Payload bytes
  for (let i = 0; i < bytes.length; i++) {
    pushBits(bytes[i], 8);
  }
  // Terminator (up to 4 zero bits)
  const totalDataBits = totalDataBytes * 8;
  const terminatorLen = Math.min(4, totalDataBits - bits.length);
  for (let i = 0; i < terminatorLen; i++) bits.push(0);
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  const out = new Uint8Array(totalDataBytes);
  let byteIdx = 0;
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i + j];
    }
    out[byteIdx++] = b;
  }

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (byteIdx < totalDataBytes) {
    out[byteIdx++] = padBytes[padIdx % 2];
    padIdx++;
  }
  return out;
}

function buildFinalCodewords(data: Uint8Array, version: number, level: QRErrorCorrectionLevel): Uint8Array {
  const [ecCount, g1b, g1d, g2b, g2d] = ECC_TABLE[level][version - 1];
  const dataBlocks: Uint8Array[] = [];
  const eccBlocks: Uint8Array[] = [];

  let offset = 0;
  for (let i = 0; i < g1b; i++) {
    const block = data.slice(offset, offset + g1d);
    offset += g1d;
    dataBlocks.push(block);
    eccBlocks.push(computeReedSolomonECC(block, ecCount));
  }
  for (let i = 0; i < g2b; i++) {
    const block = data.slice(offset, offset + g2d);
    offset += g2d;
    dataBlocks.push(block);
    eccBlocks.push(computeReedSolomonECC(block, ecCount));
  }

  const totalBlocks = g1b + g2b;
  const maxDataLen = Math.max(g1d, g2d);
  const result: number[] = [];

  for (let i = 0; i < maxDataLen; i++) {
    for (let b = 0; b < totalBlocks; b++) {
      if (i < dataBlocks[b].length) {
        result.push(dataBlocks[b][i]);
      }
    }
  }
  for (let i = 0; i < ecCount; i++) {
    for (let b = 0; b < totalBlocks; b++) {
      result.push(eccBlocks[b][i]);
    }
  }
  return new Uint8Array(result);
}

function createMatrix(size: number): { modules: boolean[][]; isFunction: boolean[][] } {
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const isFunction = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  return { modules, isFunction };
}

function setFunctionModule(
  modules: boolean[][],
  isFunction: boolean[][],
  r: number,
  c: number,
  dark: boolean
) {
  modules[r][c] = dark;
  isFunction[r][c] = true;
}

function drawFinderPattern(modules: boolean[][], isFunction: boolean[][], top: number, left: number) {
  const size = modules.length;
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const r = top + dr;
      const c = left + dc;
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      const inBox = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
      const dist = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
      const dark = inBox && (dist === 0 || dist === 1 || dist === 3);
      setFunctionModule(modules, isFunction, r, c, dark);
    }
  }
}

function drawAlignmentPattern(modules: boolean[][], isFunction: boolean[][], centerR: number, centerC: number) {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const dist = Math.max(Math.abs(dr), Math.abs(dc));
      setFunctionModule(modules, isFunction, centerR + dr, centerC + dc, dist === 0 || dist === 2);
    }
  }
}

function drawFunctionPatterns(modules: boolean[][], isFunction: boolean[][], version: number) {
  const size = modules.length;

  // 3 Finder patterns
  drawFinderPattern(modules, isFunction, 0, 0);
  drawFinderPattern(modules, isFunction, 0, size - 7);
  drawFinderPattern(modules, isFunction, size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0;
    if (!isFunction[6][i]) setFunctionModule(modules, isFunction, 6, i, dark);
    if (!isFunction[i][6]) setFunctionModule(modules, isFunction, i, 6, dark);
  }

  // Alignment patterns
  const coords = ALIGNMENT_PATTERNS[version] || [];
  for (let i = 0; i < coords.length; i++) {
    for (let j = 0; j < coords.length; j++) {
      const r = coords[i];
      const c = coords[j];
      // Skip corners overlapping finders
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === coords.length - 1) ||
        (i === coords.length - 1 && j === 0)
      ) {
        continue;
      }
      drawAlignmentPattern(modules, isFunction, r, c);
    }
  }

  // Reserve format info cells
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
    }
  }
  for (let i = size - 8; i < size; i++) {
    isFunction[8][i] = true;
    isFunction[i][8] = true;
  }
  // Dark module
  setFunctionModule(modules, isFunction, size - 8, 8, true);

  // Version info (v >= 7)
  if (version >= 7) {
    const verBits = getVersionInfoBits(version);
    for (let i = 0; i < 18; i++) {
      const dark = ((verBits >> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = (i % 3) + size - 11;
      setFunctionModule(modules, isFunction, a, b, dark);
      setFunctionModule(modules, isFunction, b, a, dark);
    }
  }
}

function drawFormatBits(
  modules: boolean[][],
  isFunction: boolean[][],
  level: QRErrorCorrectionLevel,
  mask: number
) {
  const size = modules.length;
  const bits = getFormatInfoBits(level, mask);

  // Around top-left finder
  for (let i = 0; i <= 5; i++) {
    setFunctionModule(modules, isFunction, 8, i, ((bits >> i) & 1) === 1);
  }
  setFunctionModule(modules, isFunction, 8, 7, ((bits >> 6) & 1) === 1);
  setFunctionModule(modules, isFunction, 8, 8, ((bits >> 7) & 1) === 1);
  setFunctionModule(modules, isFunction, 7, 8, ((bits >> 8) & 1) === 1);
  for (let i = 9; i < 15; i++) {
    setFunctionModule(modules, isFunction, 14 - i, 8, ((bits >> i) & 1) === 1);
  }

  // Bottom-left & top-right
  for (let i = 0; i < 8; i++) {
    setFunctionModule(modules, isFunction, size - 1 - i, 8, ((bits >> i) & 1) === 1);
  }
  for (let i = 8; i < 15; i++) {
    setFunctionModule(modules, isFunction, 8, size - 15 + i, ((bits >> i) & 1) === 1);
  }
}

function placeCodewords(modules: boolean[][], isFunction: boolean[][], codewords: Uint8Array) {
  const size = modules.length;
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        if (!isFunction[r][c]) {
          let dark = false;
          if (bitIdx < totalBits) {
            dark = ((codewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1) === 1;
            bitIdx++;
          }
          modules[r][c] = dark;
        }
      }
    }
    upward = !upward;
  }
}

function shouldMask(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0:
      return (r + c) % 2 === 0;
    case 1:
      return r % 2 === 0;
    case 2:
      return c % 3 === 0;
    case 3:
      return (r + c) % 3 === 0;
    case 4:
      return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5:
      return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6:
      return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    default:
      return false;
  }
}

function applyMask(modules: boolean[][], isFunction: boolean[][], mask: number) {
  const size = modules.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c] && shouldMask(mask, r, c)) {
        modules[r][c] = !modules[r][c];
      }
    }
  }
}

function calculatePenalty(modules: boolean[][]): number {
  const size = modules.length;
  let penalty = 0;

  // N1: 5+ consecutive same-color modules in row/col
  for (let r = 0; r < size; r++) {
    let runColor = modules[r][0];
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }
  for (let c = 0; c < size; c++) {
    let runColor = modules[0][c];
    let runLen = 1;
    for (let r = 1; r < size; r++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  // N2: 2x2 blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const color = modules[r][c];
      if (
        modules[r][c + 1] === color &&
        modules[r + 1][c] === color &&
        modules[r + 1][c + 1] === color
      ) {
        penalty += 3;
      }
    }
  }

  // N3: 1:1:3:1:1 finder-like patterns
  const matchFinderLike = (arr: boolean[], i: number) =>
    i + 10 < arr.length &&
    ((arr[i] &&
      !arr[i + 1] &&
      arr[i + 2] &&
      arr[i + 3] &&
      arr[i + 4] &&
      !arr[i + 5] &&
      arr[i + 6] &&
      !arr[i + 7] &&
      !arr[i + 8] &&
      !arr[i + 9] &&
      !arr[i + 10]) ||
      (!arr[i] &&
        !arr[i + 1] &&
        !arr[i + 2] &&
        !arr[i + 3] &&
        arr[i + 4] &&
        !arr[i + 5] &&
        arr[i + 6] &&
        arr[i + 7] &&
        arr[i + 8] &&
        !arr[i + 9] &&
        arr[i + 10]));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      if (matchFinderLike(modules[r], c)) penalty += 40;
    }
  }
  const colArr = new Array<boolean>(size);
  for (let c = 0; c < size; c++) {
    for (let r = 0; r < size; r++) colArr[r] = modules[r][c];
    for (let r = 0; r <= size - 11; r++) {
      if (matchFinderLike(colArr, r)) penalty += 40;
    }
  }

  // N4: dark module balance
  let darkCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) darkCount++;
    }
  }
  const total = size * size;
  const k = Math.floor(Math.abs(darkCount * 20 - total * 10) / total);
  penalty += k * 10;

  return penalty;
}

export function generateQRCode(
  text: string,
  preferredLevel: QRErrorCorrectionLevel = 'M'
): QRCodeResult {
  const bytes = new TextEncoder().encode(text);
  const { version, level } = selectVersionAndLevel(bytes.length, preferredLevel);
  const dataCW = encodeDataCodewords(bytes, version, level);
  const finalCW = buildFinalCodewords(dataCW, version, level);

  const size = version * 4 + 17;
  const { modules, isFunction } = createMatrix(size);
  drawFunctionPatterns(modules, isFunction, version);
  placeCodewords(modules, isFunction, finalCW);

  let bestMask = 0;
  let minPenalty = Infinity;

  for (let mask = 0; mask < 8; mask++) {
    drawFormatBits(modules, isFunction, level, mask);
    applyMask(modules, isFunction, mask);
    const penalty = calculatePenalty(modules);
    if (penalty < minPenalty) {
      minPenalty = penalty;
      bestMask = mask;
    }
    applyMask(modules, isFunction, mask); // undo
  }

  drawFormatBits(modules, isFunction, level, bestMask);
  applyMask(modules, isFunction, bestMask);

  return {
    version,
    size,
    eccLevel: level,
    modules
  };
}

export function qrToSvgDataUrl(qr: QRCodeResult, quietZone = 4): string {
  const dim = qr.size + quietZone * 2;
  const paths: string[] = [];
  for (let r = 0; r < qr.size; r++) {
    let runStart = -1;
    for (let c = 0; c <= qr.size; c++) {
      const dark = c < qr.size && qr.modules[r][c];
      if (dark && runStart === -1) {
        runStart = c;
      } else if (!dark && runStart !== -1) {
        paths.push(`M${runStart + quietZone},${r + quietZone}h${c - runStart}v1h-${c - runStart}z`);
        runStart = -1;
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges"><rect width="${dim}" height="${dim}" fill="#ffffff"/><path d="${paths.join('')}" fill="#000000"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
