import { storage } from '../firebase';
import { ref, uploadString, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { GOOGLE_SCRIPT_URL, GOOGLE_DRIVE_FOLDER_ID } from './config';

export const getDisplayImageUrl = (url: string | undefined): string => {
  if (!url) return '';
  
  // Xử lý link Google Drive để hiển thị được trong thẻ img (giống như code cũ của Vercel)
  if (url.includes('drive.google.com') || url.includes('googleusercontent.com')) {
    // Nếu nó đã là link thumbnail thì giữ nguyên
    if (url.includes('drive.google.com/thumbnail')) return url;
    
    // Tìm ID file
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
          body: JSON.stringify({ action: 'delete_image', fileId: fileIdMatch[0] })
        });
      }
    } catch (e) {
      console.warn('Failed to delete from Drive:', e);
    }
    return;
  }

  if (imageUrl.includes('firebasestorage.googleapis.com')) {
    try {
      const storageRef = ref(storage, imageUrl);
      await deleteObject(storageRef);
    } catch (e) {
      console.warn('Failed to delete from Firebase:', e);
    }
  }
};

export const uploadImageToStorage = async (
  base64Image: string,
  path: string,
  displayFolderName?: string
): Promise<string> => {
  if (!base64Image.startsWith('data:image')) {
    return base64Image;
  }

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
        folderName: displayFolderName
      })
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      if (result.status === 'success' && result.url) {
        return result.url;
      }
      throw new Error(result.message || 'Apps Script returned error status');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  } catch (e: any) {
    console.warn('Google Drive upload failed, falling back to Firebase Storage:', e.message);
  }

  // Fallback to Firebase Storage with improved reliability
  try {
    const storageRef = ref(storage, path);
    const parts = base64Image.split(',');
    if (parts.length < 2) {
      throw new Error('Định dạng ảnh không hợp lệ');
    }
    
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    
    console.log(`Uploading to Firebase ${path}...`);

    const uploadPromise = uploadString(storageRef, parts[1], 'base64', { contentType: mime });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Lỗi cấu hình Firebase Storage, không thể tải ảnh lên (Timeout).')), 15000)
    );

    const snapshot = (await Promise.race([uploadPromise, timeoutPromise])) as any;
    console.log('Firebase upload successful:', snapshot.metadata?.fullPath);
    
    return await getDownloadURL(storageRef);
  } catch (error: any) {
    console.error('Storage Upload Error:', error);
    throw new Error(error.message || 'Lỗi cấu hình Firebase Storage hoặc tải ảnh lên thất bại');
  }
};

export const compressImage = (
  file: File, 
  maxWidth = 2048, // Increased for HD quality
  maxHeight = 2048, // Increased for HD quality
  quality = 0.85, // Increased quality to 85%
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

      // Aggressive resizing
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
      
      // JPEG with 0.5 quality for very small size but acceptable for mobile
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      console.log(`Compressed image size: ${Math.round(dataUrl.length / 1024)} KB`);
      resolve(dataUrl);
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };
  });
};
