# WebFeedback -- Next.js Integration Prompt

You are integrating the **WebFeedback** widget into a Next.js application. WebFeedback is a drop-in feedback widget (Web Component with Shadow DOM) that captures user feedback with automatic screenshots, categories, star ratings, and arbitrary metadata. It submits feedback to a hosted backend via a REST API authenticated by a per-site key.

## Configuration

Replace placeholders before starting:

| Placeholder              | Description                                      | Example                                    |
|--------------------------|--------------------------------------------------|--------------------------------------------|
| `FEEDBACK_URL`           | WebFeedback backend URL                          | `https://web-feedback.vercel.app`          |
| `FEEDBACK_SITE_KEY`      | Site key from the WebFeedback admin dashboard     | `cmxxxxxxxxxxxxxxxxxxxxxx`                 |

## Step 1: Environment Variables

Add to `.env.local` (or `.env`):

```env
NEXT_PUBLIC_FEEDBACK_URL=FEEDBACK_URL
NEXT_PUBLIC_FEEDBACK_SITE_KEY=FEEDBACK_SITE_KEY
```

Both must be prefixed with `NEXT_PUBLIC_` so they are available in client components.

## Step 2: TypeScript Declaration

Download the type declaration file so TypeScript recognises the `<feedback-widget>` custom element in JSX and provides correct types for `querySelector`.

**Download `feedback-widget.d.ts` from your WebFeedback instance:**

```bash
curl -o types/feedback-widget.d.ts FEEDBACK_URL/feedback-widget.d.ts
```

Or create `types/feedback-widget.d.ts` manually:

```ts
import type { FeedbackWidgetElement, FeedbackWidgetAttributes } from "./feedback-widget";

declare global {
  interface HTMLElementTagNameMap {
    "feedback-widget": FeedbackWidgetElement;
  }

  namespace React.JSX {
    interface IntrinsicElements {
      "feedback-widget": React.DetailedHTMLProps<
        React.HTMLAttributes<FeedbackWidgetElement> & FeedbackWidgetAttributes,
        FeedbackWidgetElement
      >;
    }
  }
}

export {};
```

> **Note:** React 19 uses `React.JSX.IntrinsicElements` (not the global `JSX` namespace). The declaration above works with `@types/react@19+`.

Ensure this file is included in `tsconfig.json` via the `include` array (e.g. `"types/**/*.d.ts"` or `"**/*.ts"`).

## Step 3: FeedbackWidget Client Component

Create a `"use client"` component that dynamically loads the widget script and renders the custom element.

**Create `components/feedback-widget.tsx`:**

```tsx
"use client";

import { useEffect } from "react";

interface FeedbackWidgetProps {
  siteKey: string;
  apiUrl: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, unknown>;
  position?: string;
  themeColor?: string;
}

export default function FeedbackWidget({
  siteKey,
  apiUrl,
  userId,
  userName,
  metadata,
  position = "bottom-right",
  themeColor,
}: FeedbackWidgetProps) {
  useEffect(() => {
    if (document.querySelector(`script[src="${apiUrl}/widget.js"]`)) return;
    const script = document.createElement("script");
    script.src = `${apiUrl}/widget.js`;
    script.async = true;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [apiUrl]);

  return (
    <feedback-widget
      site-key={siteKey}
      api-url={apiUrl}
      position={position}
      {...(userId ? { "user-id": userId } : {})}
      {...(userName ? { "user-name": userName } : {})}
      {...(metadata ? { metadata: JSON.stringify(metadata) } : {})}
      {...(themeColor ? { "theme-color": themeColor } : {})}
    />
  );
}
```

### Props reference

| Prop          | Type                       | Required | Description                                                        |
|---------------|----------------------------|----------|--------------------------------------------------------------------|
| `siteKey`     | `string`                   | Yes      | Site key from the admin dashboard                                  |
| `apiUrl`      | `string`                   | Yes      | WebFeedback backend URL                                            |
| `userId`      | `string`                   | No       | Logged-in user's ID. Attached to each feedback submission.         |
| `userName`    | `string`                   | No       | Logged-in user's display name.                                     |
| `metadata`    | `Record<string, unknown>`  | No       | Arbitrary data (plan, role, feature flags, etc.)                   |
| `position`    | `string`                   | No       | Button position. Default: `bottom-right`. Options: `bottom-left`, `bottom-center`, `top-right`, `top-left`, `top-center`, `middle-right`, `middle-left` |
| `themeColor`  | `string`                   | No       | Hex colour for button and accents. Default: `#6366f1`              |

## Step 4: Add to Layout

Wire the component into the application layout. The goal is to:
1. Render the widget on every page.
2. Pass the currently logged-in user's ID and name when available.

### Option A: Server layout with auth

If the app has server-side auth (e.g. `getServerSession`, cookies, or a server-side auth helper):

```tsx
// app/layout.tsx (or app/(app)/layout.tsx)
import FeedbackWidget from "@/components/feedback-widget";
import { getSession } from "@/lib/auth"; // replace with your auth helper

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="en">
      <body>
        {children}
        <FeedbackWidget
          siteKey={process.env.NEXT_PUBLIC_FEEDBACK_SITE_KEY!}
          apiUrl={process.env.NEXT_PUBLIC_FEEDBACK_URL!}
          userId={session?.user?.id}
          userName={session?.user?.name}
          metadata={{
            email: session?.user?.email,
            role: session?.user?.role,
          }}
        />
      </body>
    </html>
  );
}
```

### Option B: Client-side auth context

If the app uses a client-side auth provider (e.g. `useSession` from NextAuth, Clerk `useUser`, Supabase `useUser`):

```tsx
// components/feedback-with-user.tsx
"use client";

import { useSession } from "next-auth/react"; // or your auth hook
import FeedbackWidget from "./feedback-widget";

export default function FeedbackWithUser() {
  const { data: session } = useSession();

  return (
    <FeedbackWidget
      siteKey={process.env.NEXT_PUBLIC_FEEDBACK_SITE_KEY!}
      apiUrl={process.env.NEXT_PUBLIC_FEEDBACK_URL!}
      userId={session?.user?.id}
      userName={session?.user?.name}
      metadata={{
        email: session?.user?.email,
      }}
    />
  );
}
```

Then add `<FeedbackWithUser />` at the end of `<body>` in the root layout.

### Option C: No auth (anonymous feedback)

If the app has no authentication, simply render the widget without user props:

```tsx
<FeedbackWidget
  siteKey={process.env.NEXT_PUBLIC_FEEDBACK_SITE_KEY!}
  apiUrl={process.env.NEXT_PUBLIC_FEEDBACK_URL!}
/>
```

## How it works

- The widget script loads asynchronously and registers a `<feedback-widget>` Web Component.
- It uses Shadow DOM so its styles never conflict with the host application.
- When the user opens the feedback modal, `html2canvas-pro` is lazy-loaded to capture a screenshot of the page.
- On submit, the widget sends a `POST` to `{api-url}/api/feedback` with the header `X-Site-Key: {site-key}`.
- The payload includes: `pageTitle`, `pageUrl`, `urlParams`, `userId`, `userName`, `message`, `category`, `rating`, `screenshot`, `metadata`, and `userAgent`.
- Feedback is viewable in the WebFeedback admin dashboard and can optionally sync to GitHub Issues or Notion.

## Verification

After integration, verify:
1. The floating feedback button appears in the configured position.
2. Opening the modal captures a screenshot of the page.
3. Submitting feedback succeeds (check for the "Thank you" confirmation).
4. In the WebFeedback admin dashboard, the submission appears with the correct user info, page URL, and screenshot.
