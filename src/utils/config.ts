export const GOOGLE_SCRIPT_URL: string =
  (import.meta as any).env?.VITE_GOOGLE_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbxB83U_JaleW-Z2mWKfuqtokRQkT8d0kNGTSvZDE_j5dv2ja7oXSXm2ql3VnuaEZwvTjQ/exec';

export const GOOGLE_DRIVE_FOLDER_ID = '1N3yRO61mkEcWf2mQ-2aA244kfGA7hs11';

// Cloudflare R2 — upload/delete đi qua /api/r2-upload + /api/r2-delete (server-side).
// KHÔNG đặt R2 secret trong VITE_ env — nó sẽ lộ trong client bundle.
