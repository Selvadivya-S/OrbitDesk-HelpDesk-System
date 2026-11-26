# API Reference
Base URL: `http://localhost:5000/api`
For protected endpoints send `Authorization: Bearer <token>`.

## Authentication
- `POST /auth/register` `{name,email,password}` – creates a user role account and returns JWT.
- `POST /auth/login` `{email,password}` – returns JWT and profile.
- `GET /auth/me` – authenticated profile.

## Tickets (authenticated)
- `GET /tickets?status=Open&priority=High&search=login&page=1&limit=10` – user sees own tickets; admin sees all.
- `POST /tickets` `{title,description,category,priority}` – create ticket.
- `GET /tickets/:id` – ticket detail (owner or admin).
- `PUT /tickets/:id` `{title,description,category}` – owner may update while ticket is Open; admin can also update priority/status.
- `DELETE /tickets/:id` – owner may delete while Open; admin may delete any ticket.
- `PATCH /tickets/:id/status` `{status}` – admin only; allowed: Open, In Progress, Resolved, Closed.
- `PATCH /tickets/:id/priority` `{priority}` – admin only; allowed: Low, Medium, High, Urgent.
- `GET /tickets/:id/comments` – ticket comments.
- `POST /tickets/:id/comments` `{message}` – add a comment.
- `GET /tickets/:id/activity` – activity logs.

## Typical responses
Success returns JSON. Errors generally return `{ "message": "..." }` and appropriate HTTP status (`400`, `401`, `403`, `404`, `409`, `500`).

## Additional APIs

### Notifications (JWT)
- `GET /api/notifications` — list recent notifications and unread count
- `PATCH /api/notifications/:id/read` — mark one notification read
- `PATCH /api/notifications/read-all` — mark all read

### Profile (JWT)
- `GET /api/auth/profile` — profile data
- `PATCH /api/auth/profile` — update display name

### Admin analytics (Admin JWT)
- `GET /api/tickets/admin/analytics` — ticket totals, status/priority/category distributions, and daily ticket trend for the last 30 days

### Real-time events (Socket.IO)
Socket connection uses the JWT in `auth.token`. Ticket detail clients emit `ticket:join` with a ticket ID. The server authorizes membership before joining. Events include `comment:new` and `ticket:updated`; notifications are delivered as `notification:new` to the authenticated user's room.
