const express = require('express');
const path = require('path');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Parse URL-encoded bodies (forms)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files (optional)
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index');
});

// Resource hub
app.get('/chub', (req, res) => {
    res.render('CHub', { resources });
});

// Forum
app.get('/forum', (req, res) => {
    res.render('forum', { posts });
});

// Submit a new resource
app.post('/submit', (req, res) => {
    const { title, url, description } = req.body;
    if (!title || !url) {
        return res.status(400).send('Title and URL are required');
    }
    resources.push({ id: resources.length + 1, title, url, description });
    res.redirect('/chub');
});

// Submit a new forum post
app.post('/post', (req, res) => {
    const { author, message } = req.body;
    if (!author || !message) {
        return res.status(400).send('Author and message are required');
    }
    posts.push({ id: posts.length + 1, author, message, createdAt: new Date() });
    res.redirect('/forum');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
