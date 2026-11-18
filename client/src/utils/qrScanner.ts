import { decodeQRCodeFromImageData } from './qrDecoder';

interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]>;
}

interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

let cachedDetector: BarcodeDetectorLike | null | undefined;

async function getBarcodeDetector(): Promise<BarcodeDetectorLike | null> {
  if (cachedDetector !== undefined) return cachedDetector;
  try {
    const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Ctor) {
      cachedDetector = null;
      return null;
    }
    if (typeof Ctor.getSupportedFormats === 'function') {
      const formats = await Ctor.getSupportedFormats();
      if (!formats.includes('qr_code')) {
        cachedDetector = null;
        return null;
      }
    }
    cachedDetector = new Ctor({ formats: ['qr_code'] });
    return cachedDetector;
  } catch {
    cachedDetector = null;
    return null;
  }
}

export async function detectQRFromVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): Promise<string | null> {
  if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const detector = await getBarcodeDetector();
  if (detector) {
    try {
      const barcodes = await detector.detect(video);
      const found = barcodes.find((b) => typeof b.rawValue === 'string' && b.rawValue.trim().length > 0);
      if (found) return found.rawValue;
    } catch {
      // Fall through to canvas pure-TS decoder
    }
  }

  const maxDim = 960;
  const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
  const w = Math.max(1, Math.round(video.videoWidth * scale));
  const h = Math.max(1, Math.round(video.videoHeight * scale));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  return decodeQRCodeFromImageData(imageData);
}

export async function detectQRFromImageFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to load image file.'));
      el.src = url;
    });

    const detector = await getBarcodeDetector();
    if (detector) {
      try {
        const barcodes = await detector.detect(img);
        const found = barcodes.find((b) => typeof b.rawValue === 'string' && b.rawValue.trim().length > 0);
        if (found) return found.rawValue;
      } catch {
        // Fall through to canvas pure-TS decoder
      }
    }

    const maxDim = 1280;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    return decodeQRCodeFromImageData(imageData);
  } finally {
    URL.revokeObjectURL(url);
  }
}
