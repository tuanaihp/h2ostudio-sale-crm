import { supabase } from '../supabase';
import { GOOGLE_SCRIPT_URL, GOOGLE_DRIVE_FOLDER_ID } from './config';

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

export const uploadImageToStorage = async (
  base64Image: string,
  path: string,
  displayFolderName?: string
): Promise<string> => {
  if (!base64Image.startsWith('data:image')) return base64Image;

  // Primary: Google Drive via Apps Script
  try {
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
        base64: base64Data,
        data: base64Data,
        type: mime,
        mimeType: mime,
        name: fileName,
        fileName: fileName,
        folderId: GOOGLE_DRIVE_FOLDER_ID,
        folderName: displayFolderName,
      }),
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      if (result.status === 'success' && result.url) {
        return result.url;
      }
    }
  } catch (e: any) {
    console.warn('Google Drive upload failed, falling back to Supabase Storage:', e.message);
  }

  // Fallback: Supabase Storage
  try {
    console.log(`Uploading to Supabase Storage: ${path}`);
    return await uploadToSupabase(base64Image, path);
  } catch (error: any) {
    console.error('Supabase Storage upload error:', error);
    throw new Error(error.message || 'Lỗi tải ảnh lên Supabase Storage');
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
