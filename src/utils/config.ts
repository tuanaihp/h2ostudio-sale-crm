export const GOOGLE_SCRIPT_URL: string =
  (import.meta as any).env?.VITE_GOOGLE_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbxB83U_JaleW-Z2mWKfuqtokRQkT8d0kNGTSvZDE_j5dv2ja7oXSXm2ql3VnuaEZwvTjQ/exec';

export const GOOGLE_DRIVE_FOLDER_ID = '1N3yRO61mkEcWf2mQ-2aA244kfGA7hs11';

// Cloudflare R2 — điền vào Vercel env khi tạo xong Cloudflare
export const R2_WORKER_URL: string = (import.meta as any).env?.VITE_R2_WORKER_URL || '';
export const R2_UPLOAD_SECRET: string = (import.meta as any).env?.VITE_R2_UPLOAD_SECRET || '';
