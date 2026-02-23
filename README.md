# WebFeedback

A drop-in feedback widget for any website. Users can report bugs, request features, and share feedback -- complete with automatic screenshots, star ratings, and categories. Everything lands in a multi-tenant admin dashboard.

```
┌─────────────────┐     POST /api/feedback     ┌──────────────────────┐
│   Your Website   │ ──────────────────────────▶│   WebFeedback Server  │
│  <feedback-widget│   (with site-key header)   │    + Admin Dashboard  │
│   site-key="…">  │                            │                      │
└─────────────────┘                             │   ┌──────────────┐  │
                                                │   │  PostgreSQL   │  │
┌─────────────────┐                             │   └──────────────┘  │
│ Chrome Extension │ ──────────────────────────▶│                      │
│  (any website)   │   (no code changes needed) │  GitHub Issues sync  │
└─────────────────┘                             │  Notion sync         │
                                                └──────────────────────┘
```

## Features

- **One-line install** -- Add a `<script>` tag and a `<feedback-widget>` element. That's it.
- **Automatic screenshots** -- Captures the page when the feedback dialog opens via html2canvas.
- **Shadow DOM isolation** -- Widget styles never conflict with your site.
- **Categories and ratings** -- Bug, feature, general + 5-star ratings.
- **User context** -- Pass `user-id`, `user-name`, and arbitrary JSON metadata.
- **Multi-tenant** -- Each site gets its own API key and isolated data.
- **Admin dashboard** -- Search, filter, and manage feedback with status tracking.
- **Integrations** -- Auto-sync feedback to GitHub Issues and Notion databases.
- **Chrome extension** -- Capture feedback on any website without code changes.
- **Customisable** -- Position anywhere, match your brand colour.

## Quick Start

### 1. Get your credentials

Sign up at your WebFeedback instance (or self-host -- see [Development](#development) below).
After setup you'll have:

- **API URL** -- e.g. `https://web-feedback.vercel.app`
- **Site Key** -- e.g. `cmxxxxxxxxxxxxxxxxxxxxxx` (from Admin > Settings)

### 2. Add the widget

#### Option A: npm (recommended for React / Next.js / bundled apps)

```bash
npm install @webfeedback/widget
```

Then import it once (the import registers the `<feedback-widget>` custom element as a side effect):

```ts
import "@webfeedback/widget";
```

For React/JSX TypeScript support, also import the type augmentation:

```ts
import "@webfeedback/widget/react";
```

Then use the element in your HTML or JSX:

```html
<feedback-widget
  site-key="YOUR_SITE_KEY"
  api-url="https://YOUR_API_URL"
></feedback-widget>
```

#### Option B: Script tag (no build step)

Paste this before your closing `</body>` tag:

```html
<script src="https://YOUR_API_URL/widget.js"></script>
<feedback-widget
  site-key="YOUR_SITE_KEY"
  api-url="https://YOUR_API_URL"
></feedback-widget>
```

Either way, a floating feedback button will appear in the bottom-right corner.

## Widget Reference

### Attributes

| Attribute      | Required | Description                                                              |
|----------------|----------|--------------------------------------------------------------------------|
| `site-key`     | Yes      | Your site's API key                                                      |
| `api-url`      | Yes      | WebFeedback backend URL                                                  |
| `position`     | No       | Button position. Default: `bottom-right`                                 |
| `user-id`      | No       | Logged-in user's ID (attached to submissions)                            |
| `user-name`    | No       | Logged-in user's display name                                            |
| `page-title`   | No       | Override page title (falls back to `document.title`)                     |
| `page-id`      | No       | Custom page identifier for your own tracking                             |
| `metadata`     | No       | JSON string of arbitrary data (e.g. `'{"plan":"pro"}'`)                  |
| `theme-color`  | No       | Hex colour for the button and accents. Default: `#6366f1`                |
| `hide-trigger` | No       | Hide the floating button (use `.open()` to trigger programmatically)     |

### Position Options

`bottom-right` (default), `bottom-left`, `bottom-center`, `top-right`, `top-left`, `top-center`, `middle-right`, `middle-left`

### Programmatic Control

```js
const widget = document.querySelector('feedback-widget');
widget.open();   // open the feedback modal
widget.close();  // close it
```

### Example with User Context

```html
<feedback-widget
  site-key="cmxxxxxxxxxxxxxxxxxxxxxx"
  api-url="https://web-feedback.vercel.app"
  user-id="usr_12345"
  user-name="Jane Smith"
  metadata='{"plan":"pro","team":"engineering","version":"2.1.0"}'
  theme-color="#0ea5e9"
  position="bottom-left"
></feedback-widget>
```

## TypeScript Support

The npm package ships with full TypeScript declarations out of the box:

- **DOM types** -- `document.querySelector('feedback-widget')` returns a typed `FeedbackWidget` with `open()` and `close()` methods
- **Attribute types** -- all widget attributes are typed, including position literals
- **React JSX** -- opt-in via `import "@webfeedback/widget/react"`

### npm install (types included automatically)

```ts
import "@webfeedback/widget";                // registers the custom element + DOM types
import "@webfeedback/widget/react";          // adds <feedback-widget> to React JSX (optional)

const widget = document.querySelector("feedback-widget");
widget?.open();   // typed -- no cast needed
widget?.close();  // typed
```

### Script tag (manual type setup)

If you use the `<script>` tag instead of npm, download the declaration file:

```bash
curl -o types/feedback-widget.d.ts https://YOUR_API_URL/feedback-widget.d.ts
```

Then include it in `tsconfig.json`:

```json
{
  "include": ["types/**/*.d.ts", "**/*.ts", "**/*.tsx"]
}
```

## Next.js Integration

For Next.js apps, install the package and create a client component.

See the full step-by-step guide: **[docs/INTEGRATE_NEXTJS.md](docs/INTEGRATE_NEXTJS.md)**

**Quick version:**

```bash
npm install @webfeedback/widget
```

```tsx
// components/feedback-widget.tsx
"use client";
import "@webfeedback/widget";
import "@webfeedback/widget/react";

interface FeedbackWidgetProps {
  siteKey: string;
  apiUrl: string;
  userId?: string;
  userName?: string;
}

export default function FeedbackWidget({ siteKey, apiUrl, userId, userName }: FeedbackWidgetProps) {
  return (
    <feedback-widget
      site-key={siteKey}
      api-url={apiUrl}
      {...(userId && { "user-id": userId })}
      {...(userName && { "user-name": userName })}
    />
  );
}
```

Then add it to your layout:

```tsx
// app/layout.tsx
<FeedbackWidget
  siteKey={process.env.NEXT_PUBLIC_FEEDBACK_SITE_KEY!}
  apiUrl={process.env.NEXT_PUBLIC_FEEDBACK_URL!}
  userId={session?.user?.id}
  userName={session?.user?.name}
/>
```

## Chrome Extension

Capture feedback on **any website** without modifying it. The extension captures the page title, URL, and a screenshot automatically.

1. Open `chrome://extensions` and enable **Developer mode**
2. Click **Load unpacked** and select the `chrome-extension/` folder
3. Click the extension icon > **Open Settings**
4. Enter your **API URL** and **Site Key**
5. Click **Save**

Now click the extension icon on any page to submit feedback.

## Admin Dashboard

Access at `/admin` after signing in.

| Section             | Description                                                  |
|---------------------|--------------------------------------------------------------|
| **Dashboard**       | Stats overview, recent feedback, charts                      |
| **Feedback**        | Searchable, filterable list with status management           |
| **Feedback Detail** | Full view with screenshot, metadata, user info, page context |
| **Sites**           | Manage multiple sites, each with its own API key             |
| **Team**            | Invite team members with role-based access                   |
| **Settings**        | Site key, embed code, GitHub and Notion integrations         |

### Feedback Statuses

- `new` -- Just submitted
- `reviewed` -- Seen by the team
- `in-progress` -- Being worked on
- `resolved` -- Addressed
- `archived` -- Filed away

## API

### Public

| Method | Endpoint          | Headers                          | Description        |
|--------|-------------------|----------------------------------|--------------------|
| POST   | `/api/feedback`   | `X-Site-Key: YOUR_SITE_KEY`      | Submit feedback    |

### Admin (authenticated via httpOnly cookie)

| Method | Endpoint               | Description                                    |
|--------|------------------------|------------------------------------------------|
| GET    | `/api/feedback`        | List feedback (supports `status`, `category`, `search`, `page`, `limit`) |
| GET    | `/api/feedback/:id`    | Get feedback detail                            |
| PATCH  | `/api/feedback/:id`    | Update status                                  |
| POST   | `/api/auth/login`      | Sign in                                        |
| POST   | `/api/auth/logout`     | Sign out                                       |
| POST   | `/api/setup`           | Create tenant + first admin                    |
| GET    | `/api/tenants/me`      | Current tenant info                            |
| GET    | `/api/sites`           | List sites                                     |
| POST   | `/api/sites`           | Create site                                    |
| GET    | `/api/team`            | List team members                              |
| POST   | `/api/team/invites`    | Send invite                                    |

## Development

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)

### Local Setup

```bash
# Start the database
docker compose up db

# Install dependencies and generate Prisma client
cd backend
npm install

# Push schema to database
npx prisma db push

# Start dev server
npm run dev
```

Open `http://localhost:3000/setup` to create your first tenant and admin account.

### Demo Page

Open `demo/index.html` in a browser to see the widget in action. Update the `site-key` attribute with your key from `/admin/settings`.

### Deploy to Vercel

1. Push to GitHub
2. Import the repo in Vercel
3. Set **Root Directory** to `backend`
4. Add environment variables:

| Variable                | Value                                     |
|-------------------------|-------------------------------------------|
| `DATABASE_URL`          | Your PostgreSQL connection string          |
| `JWT_SECRET`            | A strong random string (32+ chars)         |
| `NEXT_PUBLIC_APP_URL`   | Your deployment URL                        |

5. Deploy

## Tech Stack

| Layer               | Technology                                              |
|---------------------|---------------------------------------------------------|
| Widget              | TypeScript, Web Components, Shadow DOM, html2canvas-pro, tsup |
| Chrome Extension    | Manifest V3, `captureVisibleTab` API                    |
| Backend             | Next.js 16, TypeScript, Prisma ORM 7                    |
| Database            | PostgreSQL                                              |
| Auth                | JWT (jose) with httpOnly cookies                        |
| Styling             | Tailwind CSS v4                                         |
| Deployment          | Vercel / Docker Compose                                 |

## License

MIT
