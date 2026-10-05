const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv').config();

const app = express();
const port = 3000;
const audioFolderPath = process.env.MUSIC_PATH; // Update with your folder path
const imageFolderPath = process.env.IMAGE_PATH; // Update with your folder path

console.log('using file path: ', audioFolderPath);

app.use(cors());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' directory
// Let browsers cache songs and cover art instead of re-downloading them on every visit
app.use('/audio', express.static(audioFolderPath, { maxAge: '1d' }));
app.use('/images', express.static(imageFolderPath, { maxAge: '1d' }));

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
