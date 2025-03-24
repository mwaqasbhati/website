const express = require('express');
const sqlite3 = require('sqlite3');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('data.db', (err) => {
    if (err) console.error('Database connection error:', err);
    else console.log('Connected to database');
});

db.run(`CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT,
    referrer TEXT,
    city TEXT,
    country TEXT,
    timestamp TEXT
)`, (err) => {
    if (err) console.error('Error creating table:', err);
});

// Middleware to log visitors
async function logVisitor(req, res, next) {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const referrer = req.headers['referer'] || 'Direct';
    const timestamp = new Date().toISOString();

    try {
        const response = await fetch(`http://ip-api.com/json/${ip}`);
        const locationData = await response.json();
        const city = locationData.city || 'Unknown';
        const country = locationData.country || 'Unknown';

        db.run(`INSERT INTO clicks (ip, referrer, city, country, timestamp) 
                VALUES (?, ?, ?, ?, ?)`,
            [ip, referrer, city, country, timestamp],
            (err) => {
                if (err) console.error('Database insert error:', err);
            });
    } catch (error) {
        console.error('Error fetching location:', error);
        db.run(`INSERT INTO clicks (ip, referrer, city, country, timestamp) 
                VALUES (?, ?, ?, ?, ?)`,
            [ip, referrer, 'Unknown', 'Unknown', timestamp],
            (err) => {
                if (err) console.error('Database insert error:', err);
            });
    }
    next();
}

app.use(logVisitor);

// Routes
app.get('/clicks', (req, res) => {
    db.all('SELECT * FROM clicks ORDER BY timestamp DESC', [], (err, rows) => {
        if (err) {
            console.error('Error retrieving clicks:', err);
            return res.status(500).json({ error: 'Error retrieving data' });
        }
        res.json(rows);
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Visit http://localhost:${port} to test`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    db.close((err) => {
        if (err) console.error('Error closing database:', err);
        console.log('Database connection closed');
        process.exit(0);
    });
});