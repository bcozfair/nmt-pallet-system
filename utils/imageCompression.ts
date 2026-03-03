/**
 * Compresses an image file to a target size range (default 50-100KB).
 * Uses HTML Canvas to resize and compress JPEG quality.
 */
export const compressImage = async (file: File): Promise<File> => {
    // If already small enough, return original
    if (file.size <= 100 * 1024) return file;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        reader.onerror = (e) => reject(e);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // 1. Initial Resize (Max dimension 1024px)
            const MAX_DIMENSION = 1024;
            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                    height = Math.round((height * MAX_DIMENSION) / width);
                    width = MAX_DIMENSION;
                } else {
                    width = Math.round((width * MAX_DIMENSION) / height);
                    height = MAX_DIMENSION;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Canvas context check failed"));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);

            // 2. Iterative Compression to hit target < 100KB
            let quality = 0.7;
            let resultBlob: Blob | null = null;

            const tryCompress = () => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error("Canvas to Blob failed"));
                            return;
                        }

                        // If okay or quality too low to go further
                        if (blob.size <= 100 * 1024 || quality <= 0.2) {
                            // Convert blob back to File
                            const newFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(newFile);
                        } else {
                            // Reduce quality and try again
                            quality -= 0.1;
                            tryCompress();
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };

            tryCompress();
        };

        reader.readAsDataURL(file);
    });
};
