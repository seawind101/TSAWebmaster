-- SQLite schema for resources table
-- Ensures auto-incrementing primary key and proper defaults
CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    verified INTEGER DEFAULT 0,
    code INTEGER,
    category TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

takeown /F "C:\Users\shino\OneDrive\Documents\GitHub\TSAWebmaster\WebMaster\database\data.db"
icacls "C:\Users\shino\OneDrive\Documents\GitHub\TSAWebmaster\WebMaster\database\data.db" /grant %USERNAME%:F
Remove-Item "C:\Users\shino\OneDrive\Documents\GitHub\TSAWebmaster\WebMaster\database\data.db" -Force
