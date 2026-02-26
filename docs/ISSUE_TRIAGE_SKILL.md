# Issue Triage Skill

**Purpose**: Fetch and analyze user feedback/issues from WebFeedback API for agentic debugging.

**Backend**: `https://web-feedback-two.vercel.app` - Multi-tenant feedback collection with automatic screenshots

---

## Configuration

Set these environment variables:

```bash
FEEDBACK_API_URL=https://web-feedback-two.vercel.app
FEEDBACK_API_KEY=<your-api-key>  # Generated when creating a site
```

**Getting an API Key:**
1. Log into the WebFeedback admin dashboard
2. Go to Sites → Create Site (or view existing site)
3. Copy the API key shown on creation
4. Or create a new key at Sites → [Site Name] → API Keys

---

## Authentication

This skill uses **Bearer API Key** authentication:

```typescript
// Preferred: Authorization header (Bearer token)
Headers: { "Authorization": "Bearer your-api-key-here" }

// Also supported: X-API-Key header
Headers: { "X-API-Key": "your-api-key-here" }
```

The API key is scoped to a specific site and has permissions like:
- `feedback:read` - List and view feedback
- `feedback:write` - Update feedback status
- `sites:read` - View site details
- `sites:write` - Create sites and API keys

---

## Commands

```bash
/issues list [--status New|Pending|In Progress|Closed] [--category bug|feature|ux|general] [--limit N] [--search QUERY]
/issues get <issueId>
/issues analyze <issueId>
/issues fix-plan <issueId>
/issues sites
/issues update <issueId> --status "In Progress"
```

---

## API Endpoints

### List Feedback

```http
GET /api/feedback?status=New&category=bug&limit=20
Authorization: Bearer <api-key>
```

**Response:**
```json
{
  "feedback": [
    {
      "id": "clxxx...",
      "pageTitle": "Dashboard",
      "pageUrl": "https://example.com/dashboard",
      "userName": "John Doe",
      "message": "Button overlaps footer on mobile",
      "category": "bug",
      "rating": null,
      "status": "New",
      "createdAt": "2025-02-25T10:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### Get Single Feedback

```http
GET /api/feedback/{issueId}
Authorization: Bearer <api-key>
```

**Response:**
```json
{
  "id": "clxxx...",
  "siteId": "site_xxx",
  "pageTitle": "Dashboard",
  "pageUrl": "https://example.com/dashboard",
  "pageId": "dashboard-page",
  "userId": "user_123",
  "userName": "John Doe",
  "message": "Button overlaps footer on mobile",
  "category": "bug",
  "rating": null,
  "screenshot": "data:image/png;base64,...",
  "metadata": {
    "viewport": {"width": 375, "height": 812},
    "consoleErrors": [],
    "customField": "any-value"
  },
  "userAgent": "Mozilla/5.0...",
  "status": "New",
  "createdAt": "2025-02-25T10:00:00Z"
}
```

---

### Update Feedback Status

```http
PATCH /api/feedback/{issueId}
Authorization: Bearer <api-key>
Content-Type: application/json

{ "status": "In Progress" }
```

**Valid statuses:** `New`, `Pending`, `In Progress`, `Closed`

---

### List Sites

```http
GET /api/sites
Authorization: Bearer <api-key>
```

---

### Create Site (with auto-generated API key)

```http
POST /api/sites
Authorization: Bearer <api-key>
Content-Type: application/json

{ "name": "My Site", "domain": "example.com" }
```

**Response includes the auto-generated API key:**
```json
{
  "site": { "id": "...", "name": "My Site", ... },
  "apiKey": {
    "id": "...",
    "name": "My Site - Default Key",
    "key": "abc123...",
    "permissions": ["feedback:read", "feedback:write", "sites:read"],
    "warning": "Store this key securely - it cannot be retrieved later"
  }
}
```

---

## API Key Management

### List API Keys for a Site

```http
GET /api/sites/{siteId}/api-keys
Authorization: Bearer <api-key>
```

### Create New API Key

```http
POST /api/sites/{siteId}/api-keys
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "name": "Claude Agent Key",
  "permissions": ["feedback:read", "feedback:write"],
  "expiresInDays": 365
}
```

### Revoke API Key

```http
DELETE /api/sites/{siteId}/api-keys/{keyId}
Authorization: Bearer <api-key>
```

### Refresh/Rotate API Key

```http
POST /api/sites/{siteId}/api-keys/{keyId}/refresh
Authorization: Bearer <api-key>
```

---

## Example Session

```
User: /issues list --status New --limit 5

Assistant: Fetching issues...

Found 5 new issues:
1. clxxx123 - "Button overlaps footer on mobile" (bug) - 2h ago
   URL: https://example.com/dashboard
2. clxxx456 - "Search returns wrong results" (bug) - 5h ago
   URL: https://example.com/search
...

User: /issues analyze clxxx123

Assistant: **Issue: Button overlaps footer on mobile**

**Context**:
- Page: Dashboard (https://example.com/dashboard)
- Reported by: John Doe
- Category: bug
- Viewport: 375 x 812 (iPhone)

**Screenshot Analysis**:
The CTA button overlaps the footer on mobile viewport (375px).

**Root Cause**:
CSS conflict between `.cta-button` (position: fixed) and `.footer` (margin-top: -20px)

**Fix**:
1. Remove negative margin from footer
2. Add padding-bottom to main content for mobile

User: /issues fix-plan clxxx123

Assistant: **Fix Plan**:
- Files: `src/styles/layout.css`
- Change `.footer { margin-top: -20px }` to `margin-top: 0`
- Add mobile media query for extra padding

User: /issues update clxxx123 --status "Closed"
```

---

## Error Handling

| Error | Resolution |
|-------|------------|
| `401 Unauthorized` | Check API key is set correctly |
| `Invalid API key` | Key may have been revoked |
| `Insufficient permissions` | Key needs `feedback:read` permission |
| `404 Not Found` | Issue doesn't exist or belongs to different site |

---

## Notes

- **Authentication**: `Authorization: Bearer <key>` (preferred) or `X-API-Key: <key>`
- **API keys are site-scoped**: Each key only accesses feedback for its site
- **Screenshots**: Base64 PNG, captured automatically by widget
- **Metadata**: May include viewport, console errors, custom data
- **Statuses**: New, Pending, In Progress, Closed
- **Categories**: bug, feature, ux, general