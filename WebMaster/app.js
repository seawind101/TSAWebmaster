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
const dbPath = path.join(__dirname, 'database', 'data.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Parse URL-encoded bodies (forms)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve CSS directory so stylesheet requests like /css/index.css return the correct file and MIME type
app.use('/css', express.static(path.join(__dirname, 'css')));

app.get('/', (req, res) => {
    res.render('index');
});

// Resource hub
app.get('/chub', (req, res) => {
    db.all('SELECT * FROM resources ORDER BY datetime(created_at) DESC', (err, rows) => {
        if (err) {
            console.error('DB error fetching resources', err);
            return res.status(500).send('Database error');
        }
        const normalized = (rows || []).map(r => ({
            ...r,
            verified: Number(r.verified) || 0
        }));
        res.render('CHub', { resources: normalized });
    });
});

// Forum (resource submission page)
app.get('/forum', (req, res) => {
    res.render('forum');
});

app.get('/surplus', (req, res) => {
    res.render('surplus');
});

// Submit a new resource (matches form action in views/forum.ejs)
app.post('/submit', (req, res) => {
    const { title, url, description, code } = req.body;
    if (!title || !url) {
        return res.status(400).send('Title and URL are required');
    }
    const stmt = db.prepare('INSERT INTO resources (title, url, description, code, verified, created_at) VALUES (?, ?, ?, ?, 0, datetime("now"))');
    stmt.run(title, url, description, code, function(err) {
        stmt.finalize();
        if (err) {
            console.error('DB error inserting resource', err);
            return res.status(500).send('Database error');
        }
        const insertedId = this.lastID;
        db.get('SELECT * FROM resources WHERE id = ?', [insertedId], (err2, row) => {
            if (!err2 && row) {
                row.verified = Number(row.verified) || 0;
                io.emit('resource_added', row);
            }
            res.redirect('/chub');
        });
    });
});
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
        console.warn('Could not read .env file for admin password');
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


// Admin page route with code in URL; shows all resources with admin controls
// Admin edit page for a single resource, with verify toggle
app.get('/admin/:code/:id', (req, res) => {
    const code = req.params.code;
    const { id } = req.params;
    const adminPass = String(ADMIN_PASSWORD || '').trim();
    if (!adminPass || code !== adminPass) {
        return res.status(403).send('Invalid admin code');
    }
    db.get('SELECT * FROM resources WHERE id = ?', [id], (err, row) => {
        if (err || !row) {
            console.error('DB error fetching resource', err);
            return res.status(404).send('Resource not found');
        }
        // Coerce verified to integer for consistent rendering
        row.verified = Number(row.verified) || 0;
        res.render('admin', { resource: row, adminCode: code });
    });
});

// Render edit page; normal users reach here via resource code
app.get('/edit/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM resources WHERE id = ?', [id], (err, row) => {
        if (err || !row) return res.status(404).send('Resource not found');
        row.verified = Number(row.verified) || 0;
        res.render('edit', { resource: row });
    });
});

// Admin update: preserve verified value, only update content
app.post('/admin/update/:id', (req, res) => {
    const { id } = req.params;
    const { adminCode, title, url, description } = req.body;
    const adminPass = String(ADMIN_PASSWORD || '').trim();
    if (!adminPass || adminCode !== adminPass) {
        return res.status(403).send('Invalid admin code');
    }
    if (!title || !url) {
        return res.status(400).send('Title and URL are required');
    }
    const stmt = db.prepare('UPDATE resources SET title = ?, url = ?, description = ? WHERE id = ?');
    stmt.run(title, url, description, id, function(err) {
        stmt.finalize();
        if (err) {
            console.error('DB error updating resource (admin)', err);
            return res.status(500).send('Database error');
        }
        // Return to CHub after admin save
        res.redirect('/chub');
    });
});

// Update resource (marks verified false when user edits)
app.post('/update/:id', (req, res) => {
    const { id } = req.params;
    const { title, url, description } = req.body;
    if (!title || !url) {
        return res.status(400).send('Title and URL are required');
    }
    const stmt = db.prepare('UPDATE resources SET title = ?, url = ?, description = ?, verified = 0 WHERE id = ?');
    stmt.run(title, url, description, id, function(err) {
        stmt.finalize();
        if (err) {
            console.error('DB error updating resource', err);
            return res.status(500).send('Database error');
        }
        res.redirect('/chub');
    });
});

// Delete resource
app.post('/delete/:id', (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM resources WHERE id = ?');
    stmt.run(id, function(err) {
        stmt.finalize();
        if (err) {
            console.error('DB error deleting resource', err);
            return res.status(500).send('Database error');
        }
        // Redirect to resources list to avoid relying on Referer header
        res.redirect('/chub');
    });
});

// Toggle verified (admin only; admin page enforces code in URL)
app.post('/verify/:id', (req, res) => {
    const { id } = req.params;
    const { adminCode } = req.body;
    const adminPass = String(ADMIN_PASSWORD || '').trim();
    if (!adminPass || adminCode !== adminPass) {
        return res.status(403).json({ error: 'Invalid admin code' });
    }
    db.get('SELECT verified FROM resources WHERE id = ?', [id], (err, row) => {
        if (err || !row) {
            console.error('DB error fetching resource for verify toggle:', err);
            return res.status(404).json({ error: 'Resource not found' });
        }
        // Coerce to integer and toggle: 0 -> 1, 1 -> 0
        const currentVal = Number(row.verified) || 0;
        const newVal = currentVal === 1 ? 0 : 1;
        console.log(`Toggling verified for resource ${id}: ${currentVal} -> ${newVal}`);
        db.run('UPDATE resources SET verified = ? WHERE id = ?', [newVal, id], (err2) => {
            if (err2) {
                console.error('DB error toggling verified', err2);
                return res.status(500).json({ error: 'Database error' });
            }
            console.log(`Successfully updated verified to ${newVal} for resource ${id}`);
            // Return JSON response with updated verified state
            return res.json({ id, verified: newVal });
        });
    });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
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
