import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';

const TMP_DIR = os.tmpdir();
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

// Create temporary directory for chunks
const ensureTempDir = () => {
    const tempDir = path.join(TMP_DIR, 'banner-uploads');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    return tempDir;
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const tempDir = ensureTempDir();
        cb(null, tempDir);
    },
    filename: function (req, file, cb) {
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const timestamp = Date.now();
        req.uploadId = `${timestamp}-${uniqueId}`;
        cb(null, `${req.uploadId}-${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

    if (!validTypes.includes(file.mimetype)) {
        return cb(new Error('Only JPEG, PNG, WEBP, GIF, and SVG images are allowed'), false);
    }

    cb(null, true);
};

// Multer instance for chunked uploads
export const chunkedUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1
    }
}).single('image');

/**
 * Middleware to handle chunked uploads
 */
export const handleChunkedUpload = (req, res, next) => {
    const contentRange = req.headers['content-range'];

    if (contentRange) {
        // Handle chunked upload
        const match = contentRange.match(/bytes (\d+)-(\d+)\/(\d+)/);
        if (match) {
            const start = parseInt(match[1]);
            const end = parseInt(match[2]);
            const total = parseInt(match[3]);

            req.chunkInfo = {
                start,
                end,
                total,
                chunkSize: end - start + 1
            };
        }
    }

    next();
};

/**
 * Assemble chunks into complete file
 */
export const assembleChunks = (uploadId, originalName) => {
    return new Promise((resolve, reject) => {
        const tempDir = ensureTempDir();
        const outputPath = path.join(tempDir, `${uploadId}-complete-${originalName}`);
        const writeStream = fs.createWriteStream(outputPath);

        // Find and sort all chunks
        const chunkFiles = fs.readdirSync(tempDir)
            .filter(file => file.startsWith(`${uploadId}-chunk-`))
            .sort((a, b) => {
                const aNum = parseInt(a.match(/chunk-(\d+)/)[1]);
                const bNum = parseInt(b.match(/chunk-(\d+)/)[1]);
                return aNum - bNum;
            });

        if (chunkFiles.length === 0) {
            return reject(new Error('No chunks found'));
        }

        let currentIndex = 0;

        const writeNextChunk = () => {
            if (currentIndex >= chunkFiles.length) {
                writeStream.end();
                // Read the complete file into buffer
                fs.readFile(outputPath, (err, buffer) => {
                    if (err) {
                        // Cleanup
                        chunkFiles.forEach(file => fs.unlinkSync(path.join(tempDir, file)));
                        fs.unlinkSync(outputPath);
                        return reject(err);
                    }

                    // Cleanup chunk files
                    chunkFiles.forEach(file => fs.unlinkSync(path.join(tempDir, file)));
                    fs.unlinkSync(outputPath);

                    resolve(buffer);
                });
                return;
            }

            const chunkPath = path.join(tempDir, chunkFiles[currentIndex]);
            const readStream = fs.createReadStream(chunkPath);

            readStream.pipe(writeStream, { end: false });
            readStream.on('end', () => {
                currentIndex++;
                writeNextChunk();
            });

            readStream.on('error', (err) => {
                writeStream.destroy();
                reject(err);
            });
        };

        writeNextChunk();
    });
};