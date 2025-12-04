import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import sharp from 'sharp';
import { Readable } from 'stream';
import crypto from 'crypto';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

/**
 * Process and optimize image before upload
 */
export const processImage = async (buffer) => {
    try {
        const metadata = await sharp(buffer).metadata();

        // Resize if image is too large
        let processedBuffer = buffer;

        if (metadata.width > 2000 || metadata.height > 2000) {
            processedBuffer = await sharp(buffer)
                .resize(2000, 2000, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .toBuffer();
        }

        // Convert to WebP for better compression if not animated
        if (!metadata.pages || metadata.pages === 1) {
            processedBuffer = await sharp(processedBuffer)
                .webp({ quality: 85 })
                .toBuffer();
        }

        return processedBuffer;
    } catch (error) {
        console.error('Image processing error:', error);
        throw new Error('Failed to process image');
    }
};

/**
 * Upload image to Cloudinary with chunked streaming
 */
export const uploadToCloudinary = (buffer, folder = 'banners', options = {}) => {
    return new Promise((resolve, reject) => {
        if (!buffer || buffer.length === 0) {
            return reject(new Error('No image data provided'));
        }

        const uploadOptions = {
            folder,
            resource_type: 'image',
            chunk_size: 6000000, // 6MB chunks for Cloudinary
            timeout: 120000, // 2 minutes timeout
            ...options
        };

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return reject(new Error(`Upload failed: ${error.message}`));
                }
                if (!result || !result.secure_url) {
                    return reject(new Error('Upload completed but no URL returned'));
                }
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    format: result.format,
                    bytes: result.bytes,
                    width: result.width,
                    height: result.height
                });
            }
        );

        // Create readable stream from buffer and pipe
        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
    });
};

/**
 * Delete image from Cloudinary
 */
export const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        return false;
    }
};

/**
 * Generate unique filename with hash
 */
export const generateUniqueFilename = (originalname, buffer) => {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(buffer).digest('hex').substring(0, 8);
    const extension = originalname.split('.').pop().toLowerCase();
    const nameWithoutExt = originalname.replace(/\.[^/.]+$/, "");
    const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);

    return `${safeName}-${hash}-${timestamp}.${extension}`;
};

/**
 * Validate image dimensions and aspect ratio
 */
/**
 * Validate image dimensions and aspect ratio - Returns result instead of throwing
 */
export const validateImage = async (buffer, options = {}) => {
    const {
        minWidth = 100,
        minHeight = 100,
        maxWidth = 5000,
        maxHeight = 5000,
        aspectRatio = null,
        maxFileSize = 50 * 1024 * 1024
    } = options;

    try {
        if (buffer.length > maxFileSize) {
            return {
                isValid: false,
                error: `File size exceeds ${maxFileSize / (1024 * 1024)}MB limit`,
                metadata: null
            };
        }

        const metadata = await sharp(buffer).metadata();

        if (metadata.width < minWidth || metadata.height < minHeight) {
            return {
                isValid: false,
                error: `Image too small. Minimum dimensions: ${minWidth}x${minHeight}px`,
                metadata
            };
        }

        if (metadata.width > maxWidth || metadata.height > maxHeight) {
            return {
                isValid: false,
                error: `Image too large. Maximum dimensions: ${maxWidth}x${maxHeight}px`,
                metadata
            };
        }

        if (aspectRatio) {
            const [ratioW, ratioH] = aspectRatio.split(':').map(Number);
            const currentRatio = metadata.width / metadata.height;
            const expectedRatio = ratioW / ratioH;
            const tolerance = 0.1;

            if (Math.abs(currentRatio - expectedRatio) > tolerance) {
                return {
                    isValid: false,
                    error: `Image aspect ratio must be ${ratioW}:${ratioH}`,
                    metadata
                };
            }
        }

        return {
            isValid: true,
            metadata,
            error: null
        };
    } catch (error) {
        return {
            isValid: false,
            error: `Image validation failed: ${error.message}`,
            metadata: null
        };
    }
};