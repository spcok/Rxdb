export const getCroppedImg = async (imageSrc: string, pixelCrop: { x: number, y: number, width: number, height: number }): Promise<File> => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const rawWidth = pixelCrop.width;
  const rawHeight = pixelCrop.height;
  const MAX_DIM = 1200;

  let targetWidth = rawWidth;
  let targetHeight = rawHeight;

  if (rawWidth > MAX_DIM || rawHeight > MAX_DIM) {
    const scale = MAX_DIM / Math.max(rawWidth, rawHeight);
    targetWidth = rawWidth * scale;
    targetHeight = rawHeight * scale;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, targetWidth, targetHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
        resolve(file);
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/jpeg', 0.8);
  });
};
