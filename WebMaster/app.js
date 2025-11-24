const express = require('express');
const path = require('path');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const port = 3000;
// Initialize SQLite database
const db = new sqlite3.Database('./database/data.db', (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
        // Create resources table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            description TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});


// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Parse URL-encoded bodies (forms)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files (optional)
app.use('/public', express.static(path.join(__dirname, 'public')));
// Serve CSS directory so stylesheet requests like /css/index.css return the correct file and MIME type
app.use('/css', express.static(path.join(__dirname, 'css')));

app.get('/', (req, res) => {
    res.render('index');
});

// Resource hub
app.get('/chub', (req, res) => {
    db.all('SELECT * FROM resources ORDER BY datetime(createdAt) DESC', (err, rows) => {
        if (err) {
            console.error('DB error fetching resources', err);
            return res.status(500).send('Database error');
        }
        res.render('CHub', { resources: rows });
    });
});

// Forum (resource submission page)
app.get('/forum', (req, res) => {
    res.render('forum');
});

// Submit a new resource
app.post('/submit', (req, res) => {
    const { title, url, description } = req.body;
    if (!title || !url) {
        return res.status(400).send('Title and URL are required');
    }
    const stmt = db.prepare('INSERT INTO resources (title, url, description) VALUES (?, ?, ?)');
    stmt.run(title, url, description, function(err) {
        stmt.finalize();
        if (err) {
            console.error('DB error inserting resource', err);
            return res.status(500).send('Database error');
        }
        res.redirect('/chub');
    });
});

// Close DB on exit
process.on('SIGINT', () => {
    db.close(() => {
        console.log('Closed database connection');
        process.exit(0);
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
