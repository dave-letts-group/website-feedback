# LettsFeedback

A drop-in feedback widget for any website, backed by a Next.js admin portal with multi-tenant support.

## Architecture

```
┌─────────────────┐     POST /api/feedback     ┌──────────────────┐
│   Your Website   │ ──────────────────────────▶│  Next.js Backend  │
│  <feedback-widget│   (with site-key header)   │   + Admin Portal  │
│   site-key="…">  │                            │                   │
└─────────────────┘                             │  ┌─────────────┐ │
                                                │  │  PostgreSQL  │ │
                                                │  └─────────────┘ │
                                                └──────────────────┘
```

**Widget** — A Web Component (`<feedback-widget>`) using Shadow DOM. Captures screenshots
via html2canvas, supports configurable positioning, categories, star ratings, and arbitrary metadata.

**Backend** — Next.js 16 with Prisma ORM and PostgreSQL. Provides a REST API for
feedback submission and an admin dashboard for reviewing submissions.

**Multi-tenant** — Each site gets its own API key (site key). All feedback is isolated per tenant.

## Quick Start with Docker

```bash
docker compose up --build
```

This starts PostgreSQL and the backend on `http://localhost:3000`.

### Setup

1. Open `http://localhost:3000/setup` to create a tenant and admin account
2. Copy the **Site Key** shown after setup (also available at `/admin/settings`)
3. Add the widget to your site

### Add Widget to Your Site

```html
<script src="http://localhost:3000/widget.js"></script>
<feedback-widget
  site-key="YOUR_SITE_KEY"
  api-url="http://localhost:3000"
  position="bottom-right"
></feedback-widget>
```

## Chrome Extension (No-Code Integration)

A Chrome extension is included that lets you capture feedback on **any website** without modifying it.

### Install

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `chrome-extension/` folder
4. Click the extension icon in the toolbar → **Open Settings**
5. Enter your **API URL** (e.g. `http://localhost:3000`) and **Site Key**
6. Click **Save**

Now click the extension icon on any page to submit feedback — the page title, URL, and a screenshot are captured automatically.

## Widget Attributes

| Attribute      | Required | Description                                                              |
|----------------|----------|--------------------------------------------------------------------------|
| `site-key`     | Yes      | Your tenant's API key                                                    |
| `api-url`      | Yes      | Backend URL (e.g. `https://feedback.example.com`)                        |
| `position`     | No       | Button position. Default: `bottom-right`. Options: `bottom-left`, `bottom-center`, `top-right`, `top-left`, `top-center`, `middle-right`, `middle-left` |
| `page-title`   | No       | Current page title (falls back to `document.title`)                      |
| `page-id`      | No       | Page identifier for your own tracking                                    |
| `user-id`      | No       | Currently logged-in user's ID                                            |
| `user-name`    | No       | Currently logged-in user's name                                          |
| `metadata`     | No       | JSON string of arbitrary data (e.g. `'{"plan":"pro","version":"2.1"}'`)  |
| `theme-color`  | No       | Hex color for the button and accents. Default: `#6366f1`                 |

## Admin Portal

Access the admin portal at `/admin` after logging in.

- **Dashboard** — Stats overview, recent feedback
- **Feedback** — Searchable, filterable list with status management
- **Feedback Detail** — Full view with screenshot, metadata, page context
- **Settings** — Site key, embed code, attribute reference

## Development

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)

### Local Setup

```bash
# Start the database
docker compose up db

# Install dependencies
cd backend
npm install

# Push schema to database
npx prisma db push

# Start dev server
npm run dev
```

Open `http://localhost:3000` and go to `/setup` to create your first tenant.

### Demo Page

Open `demo/index.html` in a browser to see the widget in action. Update the `site-key`
attribute with your actual key from `/admin/settings`.

## API Endpoints

### Public (widget)

- `POST /api/feedback` — Submit feedback. Requires `X-Site-Key` header.

### Admin (authenticated)

- `GET /api/feedback` — List feedback with optional `status`, `category`, `search`, `page`, `limit` params
- `GET /api/feedback/:id` — Get feedback detail
- `PATCH /api/feedback/:id` — Update feedback status (`{ "status": "reviewed" }`)
- `POST /api/auth/login` — Login (`{ "email", "password" }`)
- `POST /api/auth/logout` — Logout
- `POST /api/setup` — Create tenant + admin account
- `GET /api/tenants/me` — Get current tenant info

## Tech Stack

- **Chrome Extension**: Manifest V3, native `captureVisibleTab` screenshots
- **Frontend Widget**: Vanilla JavaScript, Web Components, Shadow DOM, html2canvas-pro
- **Backend**: Next.js 16, TypeScript, Prisma ORM
- **Database**: PostgreSQL 16
- **Auth**: JWT (jose) with httpOnly cookies
- **Styling**: Tailwind CSS v4
- **Deployment**: Docker Compose
