const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i;
const TEXT_EXT = /\.(txt|md|csv|log)$/i;

export type ExtractionMethod = 'pdf' | 'ocr' | 'text' | 'none';

export interface ExtractionResult {
  text: string;
  method: ExtractionMethod;
  warning?: string;
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read text file'));
    reader.readAsText(file);
  });
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pages.push(pageText);
  }

  return pages.join('\n\n').trim();
}

async function extractOcrText(
  file: File | HTMLCanvasElement,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const { default: Tesseract } = await import('tesseract.js');
  const result = await Tesseract.recognize(file, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.(Math.round(m.progress * 100));
      }
    },
  });
  return result.data.text.trim();
}

async function extractScannedPdfText(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;

  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const baseViewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(baseViewport.width);
    canvas.height = Math.ceil(baseViewport.height);
    await page.render({
      canvas,
      canvasContext: canvas.getContext('2d')!,
      viewport: baseViewport,
    }).promise;
    const text = await extractOcrText(canvas, (progress) => {
      const pageProgress = ((i - 1) + progress / 100) / pdf.numPages;
      onProgress?.(Math.round(pageProgress * 100));
    });
    if (text) pages.push(text);
  }

  return pages.join('\\n\\n').trim();
}

export function getFileKind(file: File): 'pdf' | 'image' | 'text' | 'unknown' {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (file.type.startsWith('image/') || IMAGE_EXT.test(name)) return 'image';
  if (file.type.startsWith('text/') || TEXT_EXT.test(name)) return 'text';
  return 'unknown';
}

export async function extractTextFromFile(
  file: File,
  options: { useOcr?: boolean; onOcrProgress?: (progress: number) => void } = {},
): Promise<ExtractionResult> {
  const kind = getFileKind(file);

  try {
    if (kind === 'pdf') {
      const text = await extractPdfText(file);
      if (text) return { text, method: 'pdf' };

      if (options.useOcr) {
        const ocrText = await extractScannedPdfText(file, options.onOcrProgress);
        if (ocrText) {
          return {
            text: ocrText,
            method: 'ocr',
            warning: 'This scanned PDF was read with OCR. Please review the highlighted fields before saving.',
          };
        }
      }

      return {
        text: '',
        method: 'pdf',
        warning: options.useOcr
          ? 'No readable text was found in this PDF. Try a clearer scan or image.'
          : 'This PDF appears to be scanned. Enable OCR to extract its text.',
      };
    }

    if (kind === 'image') {
      if (!options.useOcr) {
        return {
          text: '',
          method: 'none',
          warning: 'Image uploaded. Enable OCR below to extract text from this image.',
        };
      }
      const text = await extractOcrText(file, options.onOcrProgress);
      if (!text) {
        return {
          text: '',
          method: 'ocr',
          warning: 'OCR completed but no readable text was found in this image.',
        };
      }
      return { text, method: 'ocr' };
    }

    if (kind === 'text') {
      const text = (await readTextFile(file)).trim();
      return { text, method: 'text' };
    }

    const text = (await readTextFile(file)).trim();
    return { text, method: 'text' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown extraction error';
    throw new Error(`Could not extract text: ${message}`);
  }
}

export const ACCEPTED_UPLOAD_TYPES =
  '.pdf,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tiff,.tif';

export const ACCEPTED_UPLOAD_MIME =
  'application/pdf,text/plain,text/markdown,image/png,image/jpeg,image/gif,image/webp,image/bmp,image/tiff';
