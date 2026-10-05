const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const dotenv = require('dotenv').config();

const app = express();
const port = 3000;
const audioFolderPath = process.env.MUSIC_PATH; // Update with your folder path
const imageFolderPath = process.env.IMAGE_PATH; // Update with your folder path
// Small cover thumbnails are generated on first request and kept here
const thumbFolderPath = process.env.THUMB_PATH || path.join(__dirname, 'thumbs');
const THUMB_SIZE = 480;

fs.mkdirSync(thumbFolderPath, { recursive: true });

console.log('using file path: ', audioFolderPath);

app.use(cors());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' directory
// Let browsers cache songs and cover art instead of re-downloading them on every visit
app.use('/audio', express.static(audioFolderPath, { maxAge: '1d' }));
app.use('/images', express.static(imageFolderPath, { maxAge: '1d' }));

// Cover thumbnails: /thumbs/<image file> returns a 480px WebP of /images/<image file>.
// Each one is made once and cached on disk; it is rebuilt if the original changes.
const thumbsInProgress = new Map();

function makeThumb(sourcePath, thumbPath) {
    if (!thumbsInProgress.has(thumbPath)) {
        const tmpPath = `${thumbPath}.${process.pid}.tmp`;
        const job = sharp(sourcePath)
            .rotate()
            .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
            .webp({ quality: 78 })
            .toFile(tmpPath)
            .then(() => fs.promises.rename(tmpPath, thumbPath))
            .finally(() => thumbsInProgress.delete(thumbPath));
        thumbsInProgress.set(thumbPath, job);
    }
    return thumbsInProgress.get(thumbPath);
}

app.get('/thumbs/:file', async (req, res) => {
    const file = path.basename(req.params.file); // never leave the images folder
    const sourcePath = path.join(imageFolderPath, file);
    const thumbPath = path.join(thumbFolderPath, `${file}.webp`);
    try {
        const source = await fs.promises.stat(sourcePath);
        const thumb = await fs.promises.stat(thumbPath).catch(() => null);
        if (!thumb || thumb.mtimeMs < source.mtimeMs) await makeThumb(sourcePath, thumbPath);
        res.sendFile(thumbPath, { maxAge: '7d' });
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.status(404).send('Image not found');
        } else {
            console.error('Thumbnail failed for', file, '-', err.message);
            res.status(500).send('Thumbnail failed');
        }
    }
});

// Endpoint to list audio files
app.get('/audio-files', (req, res) => {
    fs.readdir(audioFolderPath, (err, files) => {
        if (err) {
            res.status(500).send('Error reading the directory');
            return;
        }
        const audioFiles = files.filter(file => /\.(mp3|wav)$/i.test(file)); // Filter for .mp3 or .wav files (case-insensitive)
        res.json(audioFiles);
    });
});

// endpoint to list image files
app.get('/image-files', (req, res) => {
    fs.readdir(imageFolderPath, (err, files) => {
        if (err) {
            res.status(500).send('Error reading the directory');
            return;
        }
        res.json(files);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
