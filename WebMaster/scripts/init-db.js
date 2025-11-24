const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const sql = fs.readFileSync('./database/init.sql', 'utf8');
const db = new sqlite3.Database('./database/data.db');

db.exec(sql, (err) => {
    if (err) {
        console.error('Error initializing database:', err.message);
    } else {
        console.log('Database initialized successfully.');
    }
    db.close();
}); 
