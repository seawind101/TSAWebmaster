# Community Resource Hub

A minimal Express + EJS application with two main features:

- `/chub` — Community resource hub for sharing and discovering links
- `/forum` — Simple forum for posting messages

**Note:** The original `app.js` remains unchanged. Use `server.js` to run the demo.

## Getting Started

1. Install dependencies:
```powershell
npm install
```

2. Start the server:
```powershell
node server.js
```

Open http://localhost:3000 and navigate to the Resource Hub or Forum.

## Data Storage

This demo uses in-memory storage. Data is cleared on server restart. For production use, integrate a database (SQLite, PostgreSQL, etc.).

## Project Structure

- `server.js` — Main server entrypoint
- `views/index.ejs` — Home page
- `views/CHub.ejs` — Resource hub interface
- `views/forum.ejs` — Forum interface
