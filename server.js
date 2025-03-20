const express = require('express');
const sqlite3 = require('sqlite3');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const db = new sqlite3.Database('data.db', (err) => {
    if (err) console.error(err);
    console.log('Connected to database');
});

// Create clicks table (submissions table can stay but won’t be used)
db.run(`CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT,
    referrer TEXT,
    city TEXT,
    country TEXT,
    timestamp TEXT
)`);

// Track clicks on root URL
app.get('/', async (req, res) => {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',')[0].trim();
    let city = 'Unknown';
    try {
        const response = await fetch(`https://freeipapi.com/api/json/${ip}`);
        const locationData = await response.json();
        city = locationData.cityName || 'Unknown';
        db.run(`INSERT INTO clicks (ip, referrer, city, country, timestamp) 
                VALUES (?, ?, ?, ?, ?)`,
            [ip, req.headers['referer'] || 'Direct', city, locationData.countryName || 'Unknown', new Date().toISOString()]);
    } catch (error) {
        console.error('Error fetching location:', error);
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
    res.write(`<script>document.getElementById('location').textContent = 'You are spinning from ${city}';</script>`);
});

// View clicks (optional, for /view.html)
app.get('/clicks', (req, res) => {
    db.all('SELECT * FROM clicks', [], (err, rows) => {
        if (err) res.status(500).send('Error retrieving clicks');
        else res.json(rows);
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});