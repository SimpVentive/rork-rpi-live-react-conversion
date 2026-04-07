import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type ExportOptions = {
  fileNameBase: string;
  title: string;
  subtitle?: string;
  bodyHtml: string;
};

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildExcelHtmlDocument({ title, subtitle, bodyHtml }: Omit<ExportOptions, 'fileNameBase'>): string {
  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="ProgId" content="Excel.Sheet" />
        <meta name="Generator" content="GitHub Copilot" />
        <style>
          body { font-family: Calibri, Arial, sans-serif; color: #0f172a; margin: 24px; }
          h1 { font-size: 24px; margin: 0 0 6px; }
          h2 { font-size: 18px; margin: 24px 0 8px; }
          h3 { font-size: 14px; margin: 16px 0 8px; }
          p { margin: 0 0 10px; line-height: 1.45; }
          .subtitle { color: #475569; margin-bottom: 20px; }
          .note { color: #64748b; font-size: 12px; }
          .metric-grid { margin: 12px 0 20px; }
          .metric-grid span { display: inline-block; margin: 0 12px 8px 0; padding: 8px 10px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; }
          table { border-collapse: collapse; width: 100%; margin: 10px 0 18px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; vertical-align: top; }
          th { background: #e2e8f0; text-align: left; font-weight: 700; }
          .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; margin: 0 0 18px; }
          .pill { display: inline-block; padding: 4px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; }
          .svg-wrap { margin: 10px 0 18px; padding: 12px; border: 1px solid #cbd5e1; border-radius: 12px; background: #fff; }
          .section-break { height: 1px; background: #e2e8f0; margin: 18px 0; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
        ${bodyHtml}
      </body>
    </html>
  `;
}

async function downloadExcelOnWeb(fileName: string, content: string): Promise<string> {
  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Unable to prepare export file.'));
    };
    reader.onerror = () => reject(new Error('Unable to prepare export file.'));
    reader.readAsDataURL(blob);
  });

  const anchor = window.document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  window.document.body.appendChild(anchor);
  anchor.click();
  window.document.body.removeChild(anchor);
  return fileName;
}

export async function exportExcelHtmlReport({ fileNameBase, title, subtitle, bodyHtml }: ExportOptions): Promise<string> {
  const fileName = `${fileNameBase.replace(/[^a-z0-9-_]+/gi, '_')}.xls`;
  const content = buildExcelHtmlDocument({ title, subtitle, bodyHtml });

  if (Platform.OS === 'web') {
    return downloadExcelOnWeb(fileName, content);
  }

  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error('No writable directory available for export.');
  }

  const fileUri = `${baseDir}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.ms-excel',
      dialogTitle: title,
      UTI: 'com.microsoft.excel.xls',
    });
  }

  return fileUri;
}