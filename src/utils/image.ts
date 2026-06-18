import { supabase } from '../supabase';
import { GOOGLE_SCRIPT_URL, GOOGLE_DRIVE_FOLDER_ID, R2_WORKER_URL, R2_UPLOAD_SECRET } from './config';

export const getDisplayImageUrl = (url: string | undefined): string => {
  if (!url) return '';

  if (url.includes('drive.google.com') || url.includes('googleusercontent.com')) {
    if (url.includes('drive.google.com/thumbnail')) return url;
    const fileIdMatch = url.match(/[-\w]{25,}/);
    if (fileIdMatch && fileIdMatch[0]) {
      return `https://drive.google.com/thumbnail?id=${fileIdMatch[0]}&sz=w2000`;
    }
  }

  return url;
};

export const deleteImageFromStorage = async (imageUrl: string | undefined): Promise<void> => {
  if (!imageUrl || imageUrl.startsWith('data:image')) return;

  // R2
  if (R2_WORKER_URL && imageUrl.includes('r2.dev') || (R2_WORKER_URL && imageUrl.includes('workers.dev'))) {
    try {
      const url = new URL(imageUrl);
      const path = url.pathname.replace(/^\//, '');
      await fetch(`${R2_WORKER_URL}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(R2_UPLOAD_SECRET ? { 'Authorization': `Bearer ${R2_UPLOAD_SECRET}` } : {}),
        },
        body: JSON.stringify({ path }),
      });
    } catch (e) {
      console.warn('Failed to delete from R2:', e);
    }
    return;
  }

  // Google Drive
  if (imageUrl.includes('drive.google.com') || imageUrl.includes('googleusercontent.com')) {
    try {
      const fileIdMatch = imageUrl.match(/[-\w]{25,}/);
      if (fileIdMatch && fileIdMatch[0]) {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'delete_image', fileId: fileIdMatch[0] }),
        });
      }
    } catch (e) {
      console.warn('Failed to delete from Drive:', e);
    }
    return;
  }

  // Supabase Storage
  if (imageUrl.includes('supabase.co/storage')) {
    try {
      const match = imageUrl.match(/\/storage\/v1\/object\/public\/album-images\/(.+)/);
      if (match && match[1]) {
        await supabase.storage.from('album-images').remove([decodeURIComponent(match[1])]);
      }
    } catch (e) {
      console.warn('Failed to delete from Supabase Storage:', e);
    }
  }
};

const uploadToSupabase = async (base64Image: string, path: string): Promise<string> => {
  const parts = base64Image.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const base64Data = parts[1];

  const byteCharacters = atob(base64Data);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: mime });

  const { data, error } = await supabase.storage
    .from('album-images')
    .upload(path, blob, { contentType: mime, upsert: true });

  if (error) throw new Error(error.message);

  const { data: urlData } = supabase.storage
    .from('album-images')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
};

const uploadToR2 = async (base64Image: string, path: string): Promise<string> => {
  if (!R2_WORKER_URL) throw new Error('R2 not configured');
  const parts = base64Image.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const base64Data = parts[1];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const response = await fetch(R2_WORKER_URL, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(R2_UPLOAD_SECRET ? { 'Authorization': `Bearer ${R2_UPLOAD_SECRET}` } : {}),
    },
    body: JSON.stringify({ base64: base64Data, path, mimeType: mime }),
  });

  clearTimeout(timeoutId);
  if (!response.ok) throw new Error(`R2 Worker responded ${response.status}`);
  const result = await response.json();
  if (result.status === 'success' && result.url) return result.url;
  throw new Error('R2 returned no URL');
};

const uploadToDrive = async (base64Image: string, path: string, displayFolderName?: string): Promise<string> => {
  const parts = base64Image.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const base64Data = parts[1];
  const fileName = path.split('/').pop() || `upload_${Date.now()}.jpg`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    signal: controller.signal,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'upload_image',
      base64: base64Data, data: base64Data,
      type: mime, mimeType: mime,
      name: fileName, fileName: fileName,
      folderId: GOOGLE_DRIVE_FOLDER_ID,
      folderName: displayFolderName,
    }),
  });

  clearTimeout(timeoutId);
  if (!response.ok) throw new Error(`Drive script responded ${response.status}`);
  const result = await response.json();
  if (result.status === 'success' && result.url) return result.url;
  throw new Error('Drive returned no URL');
};

export const uploadImageToStorage = async (
  base64Image: string,
  path: string,
  displayFolderName?: string
): Promise<string> => {
  if (!base64Image.startsWith('data:image')) return base64Image;

  // Tầng 1: Cloudflare R2 (chính — nhanh nhất, CDN toàn cầu)
  if (R2_WORKER_URL) {
    try {
      return await uploadToR2(base64Image, path);
    } catch (e: any) {
      console.warn('R2 upload failed, trying Google Drive:', e.message);
    }
  }

  // Tầng 2: Google Drive (dự phòng 1)
  try {
    return await uploadToDrive(base64Image, path, displayFolderName);
  } catch (e: any) {
    console.warn('Google Drive upload failed, trying Supabase Storage:', e.message);
  }

  // Tầng 3: Supabase Storage (dự phòng cuối)
  try {
    return await uploadToSupabase(base64Image, path);
  } catch (error: any) {
    throw new Error(error.message || 'Tất cả dịch vụ lưu trữ đều thất bại');
  }
};

export const compressImage = (
  file: File,
  maxWidth = 2048,
  maxHeight = 2048,
  quality = 0.85,
  watermarkText?: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File không phải là định dạng ảnh'));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.src = objectUrl;
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
        return;
      }

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      if (watermarkText) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = 'white';
        const fontSize = Math.max(14, Math.floor(width * 0.04));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        const padding = fontSize * 1.5;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(watermarkText, width - padding, height - padding);
        ctx.restore();
      }

      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };
  });
};
