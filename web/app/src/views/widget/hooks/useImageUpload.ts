import { useState, useRef, useCallback } from 'react';
import { message } from '@ctzhian/ui';
import { UploadedImage } from '../types';
import { MAX_IMAGES, MAX_IMAGE_SIZE } from '../constants';

export const useImageUpload = () => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanupImageUrls = useCallback((images: UploadedImage[]) => {
    images.forEach(img => {
      if (img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url);
      }
    });
  }, []);

  const handleImageSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const remainingSlots = MAX_IMAGES - uploadedImages.length;
      if (remainingSlots <= 0) {
        message.warning(`最多只能上传 ${MAX_IMAGES} 张图片`);
        return;
      }

      const filesToAdd = Array.from(files).slice(0, remainingSlots);
      const newImages: UploadedImage[] = [];

      for (const file of filesToAdd) {
        if (!file.type.startsWith('image/')) {
          message.error('只支持上传图片文件');
          continue;
        }

        if (file.size > MAX_IMAGE_SIZE) {
          message.error('图片大小不能超过 10MB');
          continue;
        }

        const localUrl = URL.createObjectURL(file);
        newImages.push({
          id: Date.now().toString() + Math.random(),
          url: localUrl,
          file,
        });
      }

      setUploadedImages(prev => [...prev, ...newImages]);
    },
    [uploadedImages.length],
  );

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleImageSelect(event.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleImageSelect],
  );

  const handleRemoveImage = useCallback((id: string) => {
    setUploadedImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove && imageToRemove.url.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.url);
      }
      return prev.filter(img => img.id !== id);
    });
  }, []);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        const dataTransfer = new DataTransfer();
        imageFiles.forEach(file => dataTransfer.items.add(file));
        await handleImageSelect(dataTransfer.files);
      }
    },
    [handleImageSelect],
  );

  const clearImages = useCallback(() => {
    cleanupImageUrls(uploadedImages);
    setUploadedImages([]);
  }, [uploadedImages, cleanupImageUrls]);

  return {
    uploadedImages,
    fileInputRef,
    handleImageUpload,
    handleRemoveImage,
    handlePaste,
    clearImages,
  };
};
