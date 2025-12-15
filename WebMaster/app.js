const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const http = require('http').createServer(app);
const socketio = require('socket.io');
const io = socketio(http);
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
    code TEXT NOT NULL,
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

// surplus page
app.get('/surplus', (req, res) => {
    res.render('surplus')
});

// Submit a new resource
app.post('/submit', (req, res) => {
    const { title, url, description, code } = req.body;
    if (!title || !url) {
        return res.status(400).send('Title and URL are required');
    }
    const stmt = db.prepare('INSERT INTO resources (title, url, description, code) VALUES (?, ?, ?, ?)');
    stmt.run(title, url, description, code, function(err) {
    stmt.finalize();
    if (err) {
        console.error('DB error inserting resource', err);
        return res.status(500).send('Database error');
    }
    const insertedId = this.lastID;
    db.get('SELECT * FROM resources WHERE id = ?', [insertedId], (err2, row) => {
        if (!err2 && row) {
            io.emit('resource_added', row);
        }
        res.redirect('/chub');
    });
}); 
}); // <-- ADDED: close app.post

// Load admin password from .env (fallback to process.env.admin)
function loadAdminPassword() {
    // try process.env first
    if (process.env && process.env.admin) {
        return String(process.env.admin).replace(/^\s+|\s+$/g, '').replace(/^['\"]|['\"]$/g, '');
    }
    // fallback: read .env in project root
    try {
        const envPath = path.join(__dirname, '.env');
        const data = fs.readFileSync(envPath, 'utf8');
        const m = data.match(/^\s*admin\s*=\s*(.*)$/m);
        if (m && m[1]) {
            return String(m[1]).trim().replace(/^['\"]|['\"]$/g, '');
        }
    } catch (e) {
        // ignore - file may not exist
    }
    return '';
}
const ADMIN_PASSWORD = loadAdminPassword();

// Verify code for resource; client posts { id, code }
app.post('/verify-code', (req, res) => {
    const { id, code } = req.body;
    if (!id) return res.status(400).json({ ok: false });
    db.get('SELECT code FROM resources WHERE id = ?', [id], (err, row) => {
        if (err || !row) return res.status(404).json({ ok: false });
        const provided = String(code || '').trim();
        const dbCode = String(row.code || '').trim();
        const adminPass = String(ADMIN_PASSWORD || '').trim();
        const adminUsed = !!(adminPass && provided === adminPass);
        const match = (provided === dbCode) || adminUsed;
        return res.json({ ok: !!match, admin: !!adminUsed });
    });
});

// Admin page route
app.get('/admin', (req, res) => {
    res.render('admin');
});

// Render edit page (only if you open it; verification happens before redirect)
app.get('/edit/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM resources WHERE id = ?', [id], (err, row) => {
        if (err || !row) return res.status(404).send('Resource not found');
        res.render('edit', { resource: row });
    });
});

app.get('/admin', (req, res) => {
    res.render('admin');
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    });
    // optional: receive messages from client
    socket.on('data_sent', (data) => {
        console.log('Received data_sent from client:', data);
        // If needed, broadcast to other clients:
        // socket.broadcast.emit('data_sent', data);
    });
});

// Close DB on exit
process.on('SIGINT', () => {
    db.close(() => {
        console.log('Closed database connection');
        process.exit(0);
    });
});

app.get('/reference', (req, res) => {
    res.render('reference');
});

app.use('/referenceFiles', express.static('referenceFiles'));

http.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
