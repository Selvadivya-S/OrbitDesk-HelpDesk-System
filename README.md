# OrbitDesk — Advanced Support Ticket Management System

A polished full-stack helpdesk app for the technical assignment. OrbitDesk includes user/admin role separation, ticket workflows, real-time ticket conversations, in-app notifications, editable profile settings, admin analytics, and a persistent activity timeline.

## Technology stack
- React 18, Vite, React Router
- Node.js, Express REST APIs
- MongoDB + Mongoose
- JWT authentication and bcrypt password hashing
- Socket.IO for real-time ticket comments, status updates, and notifications
- Recharts for admin analytics visualizations
- EventEmitter for ticket activity events

## Features
### User
- Register/login and protected routes
- Create, view, search, filter, edit, and delete own tickets (edit/delete while Open)
- Ticket conversation with real-time comments
- Status/priority tracking and activity history
- Notification bell with unread counts and mark-as-read controls
- Profile settings to edit display name

### Admin
- View/manage tickets across users
- Filter/search tickets and update status/priority
- Respond to ticket conversations in real time
- Admin analytics: status, priority, and last-30-day ticket charts
- Notifications for newly created tickets and user activity

## Requirements
- Node.js 18+ (20+ recommended)
- MongoDB local service or MongoDB Atlas connection string

## Run in VS Code
Open the root folder `helpdesk-assignment` in VS Code. Use separate terminals.

### 1. Backend
```bash
cd backend
npm install
```
Copy `backend/.env.example` to `backend/.env`, then update the MongoDB URI and replace the JWT secret with a strong random value.
```bash
npm run dev
```
API: `http://localhost:5000`

### 2. Seed the admin account
Run in another terminal:
```bash
cd backend
npm run seed:admin
```
Default local seed credentials (change/remove before deployment):
- Email: `admin@helpdesk.local`
- Password: `Admin12345!`

### 3. Frontend
```bash
cd frontend
npm install
```
Copy `frontend/.env.example` to `frontend/.env` if needed.
```bash
npm run dev
```
Open the Vite URL (typically `http://localhost:5173`).

## Routes
- `/login`, `/register` — authentication
- `/dashboard` — user dashboard
- `/tickets` — user's ticket list (admin sees all)
- `/tickets/new` — create ticket
- `/tickets/:id` — ticket detail, comments, timeline
- `/admin` — admin overview
- `/admin/analytics` — admin charts
- `/settings` — profile settings

## API docs
See `docs/API.md` and `docs/HelpDesk.postman_collection.json`.

## Security notes
- Passwords are bcrypt-hashed.
- JWT-protected APIs and role-based admin checks are used.
- Ticket visibility is limited to ticket owner or admin.
- Do not commit `.env` files, real credentials, or production tokens.
- Use a strong JWT secret and configure `CLIENT_URL` for deployment.

## Assignment notes
EventEmitter records ticket activity in MongoDB and triggers notification creation. Socket.IO provides live conversation/status updates and in-app notification delivery. The app is an assignment/demo project; complete manual testing and deployment hardening before production use.
