CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    description TEXT,
    verified BOOLEAN DEFAULT FALSE,
    code INTEGER,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

takeown /F "C:\Users\shino\OneDrive\Documents\GitHub\TSAWebmaster\WebMaster\database\data.db"
icacls "C:\Users\shino\OneDrive\Documents\GitHub\TSAWebmaster\WebMaster\database\data.db" /grant %USERNAME%:F
Remove-Item "C:\Users\shino\OneDrive\Documents\GitHub\TSAWebmaster\WebMaster\database\data.db" -Force
