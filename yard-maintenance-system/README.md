# Heavy Equipment Yard Maintenance Management System

Local-first full-stack app for tracking heavy equipment entering a maintenance yard, gatepasses, job cards, mechanics, parts, SAP maintenance orders, completion/exit passes, filtered reports, and Excel exports.

## Stack
- React + Vite
- Node.js + Express
- MongoDB + Mongoose
- JWT single-admin authentication
- ExcelJS exports

## Requirements
- Node.js 20+ (LTS recommended)
- MongoDB Community Server running locally, or a MongoDB Atlas connection string
- npm

## 1. Configure the backend
Open a terminal in `server` and run:

```bash
npm install
copy .env.example .env
```

Edit `.env` and set a strong `JWT_SECRET`, admin username/password, and MongoDB URL.
On PowerShell, `copy` works in a normal PowerShell prompt; alternatively use `Copy-Item .env.example .env`.

## 2. Start MongoDB
If using MongoDB Community Server, make sure the MongoDB service is running. The default URL is:
`mongodb://127.0.0.1:27017/yard_maintenance`

Or set `MONGODB_URI` in `server/.env` to your Atlas connection string.

## 3. Start the backend
From the `server` folder:

```bash
npm run dev
```

API runs at `http://localhost:5000`. It creates the configured admin user on first startup if it does not exist.

## 4. Start the frontend
Open a second terminal:

```bash
cd client
npm install
copy .env.example .env
npm run dev
```

Open the Vite URL printed in the terminal, normally `http://localhost:5173`.

## Default login
Use the username and password you set in `server/.env`. The app does not ship with a hard-coded default password.

## Main features
- Dashboard and yard occupancy summary
- Equipment master CRUD
- Inward gatepass entries
- Job cards, SAP order number, problems/action/parts/mechanics
- Job completion and separate vehicle exit recording
- Filterable reports and `.xlsx` export
- JWT protected API routes
- Input validation and duplicate active-yard-entry prevention

## Important workflow notes
- A vehicle can have many job cards over time. `technicalObjectNumber` identifies the equipment; each visit gets its own inward record and job card.
- Job completion and physical exit are separate states. A completed vehicle remains in the “inside yard” report until an exit pass is recorded.
- “Inward gatepass number” and “exit gatepass number” are stored separately. If your site uses the same number for both, enter the same value in both fields.
- The current version records parts and mechanics as text entries on the job card. Inventory and mechanic master modules can be added later.
- This is a local starter project, not a production security review. Before exposing it to the internet, use HTTPS, strong secrets, backups, restricted database access, and review authorization/audit requirements.

## Troubleshooting
- `ECONNREFUSED 127.0.0.1:27017`: MongoDB is not running or `MONGODB_URI` is wrong.
- `401 Invalid token`: log out and sign in again.
- Port in use: change `PORT` in `server/.env`, and update `VITE_API_URL` in `client/.env`.
- If you edit `.env`, restart the relevant server.

## API outline
- `POST /api/auth/login`
- `GET/POST /api/equipment`
- `GET/POST /api/inwards`
- `GET/POST/PATCH /api/jobs`
- `POST /api/jobs/:id/complete`
- `POST /api/jobs/:id/exit`
- `GET /api/reports/summary`
- `GET /api/reports/export.xlsx`

All business data routes require a bearer token.


##mongodb is working from noushaba220791@arkajainuniversity.ac.in