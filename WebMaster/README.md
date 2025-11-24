# Community Resource Hub (simple)

This is a minimal Express + EJS app (demo) with two main pages:

- `/chub` — community resource hub where users can submit links
- `/forum` — a very simple forum where users can post messages

NOTE: This repository originally had `app.js` as the entrypoint. To keep the original file unchanged, the demo server is provided as `server.js`.

How to run
1. Install dependencies (if not already):

```powershell
npm install
```

2. Start the server:

```powershell
node app.js
```

Open http://localhost:3000 in your browser and navigate to the Resource Hub or Forum.

Persistence
This demo stores data in memory. Restarting the server clears all resources and posts. For production, replace the in-memory arrays with a database (SQLite, PostgreSQL, etc.).

Files changed/added
- `app.js` — new clean server entrypoint
- `views/index.ejs`, `views/CHub.ejs`, `views/forum.ejs` — updated UI and forms
