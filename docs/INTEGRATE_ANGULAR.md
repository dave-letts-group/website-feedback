# WebFeedback -- Angular Integration Prompt

You are integrating the **WebFeedback** widget into an Angular application. WebFeedback is a drop-in feedback widget (Web Component with Shadow DOM) that captures user feedback with automatic screenshots, categories, star ratings, and arbitrary metadata. It submits feedback to a hosted backend via a REST API authenticated by a per-site key.

## Configuration

Replace placeholders before starting:

| Placeholder              | Description                                      | Example                                    |
|--------------------------|--------------------------------------------------|--------------------------------------------|
| `FEEDBACK_URL`           | WebFeedback backend URL                          | `https://web-feedback.vercel.app`          |
| `FEEDBACK_SITE_KEY`      | Site key from the WebFeedback admin dashboard     | `cmxxxxxxxxxxxxxxxxxxxxxx`                 |

## Step 1: Environment Variables

Add to `src/environments/environment.ts` and `src/environments/environment.prod.ts`:

```ts
// environment.ts
export const environment = {
  production: false,
  feedbackUrl: 'FEEDBACK_URL',
  feedbackSiteKey: 'FEEDBACK_SITE_KEY',
};
```

```ts
// environment.prod.ts
export const environment = {
  production: true,
  feedbackUrl: 'FEEDBACK_URL',
  feedbackSiteKey: 'FEEDBACK_SITE_KEY',
};
```

## Step 2: Enable Custom Elements Schema

Angular requires `CUSTOM_ELEMENTS_SCHEMA` to use Web Components without errors.

In your `AppModule` (or the module where you use the widget):

```ts
// app.module.ts
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

For standalone components (Angular 17+), add `schemas` to the component decorator instead:

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `...`,
})
export class AppComponent {}
```

## Step 3: FeedbackWidget Component

Create a wrapper component that loads the widget script and renders the custom element.

**Generate the component:**

```bash
ng generate component feedback-widget
```

**`feedback-widget.component.ts`:**

```ts
import { Component, Input, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-feedback-widget',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <feedback-widget
      [attr.site-key]="siteKey"
      [attr.api-url]="apiUrl"
      [attr.position]="position"
      [attr.user-id]="userId || null"
      [attr.user-name]="userName || null"
      [attr.metadata]="metadataJson || null"
      [attr.theme-color]="themeColor || null"
    ></feedback-widget>
  `,
})
export class FeedbackWidgetComponent implements OnInit {
  @Input() siteKey!: string;
  @Input() apiUrl!: string;
  @Input() userId?: string;
  @Input() userName?: string;
  @Input() metadata?: Record<string, unknown>;
  @Input() position = 'bottom-right';
  @Input() themeColor?: string;

  get metadataJson(): string | null {
    return this.metadata ? JSON.stringify(this.metadata) : null;
  }

  ngOnInit(): void {
    if (typeof document !== 'undefined' &&
        !document.querySelector(`script[src="${this.apiUrl}/widget.js"]`)) {
      const script = document.createElement('script');
      script.src = `${this.apiUrl}/widget.js`;
      script.async = true;
      document.body.appendChild(script);
    }
  }
}
```

### Inputs reference

| Input         | Type                       | Required | Description                                                        |
|---------------|----------------------------|----------|--------------------------------------------------------------------|
| `siteKey`     | `string`                   | Yes      | Site key from the admin dashboard                                  |
| `apiUrl`      | `string`                   | Yes      | WebFeedback backend URL                                            |
| `userId`      | `string`                   | No       | Logged-in user's ID. Attached to each feedback submission.         |
| `userName`    | `string`                   | No       | Logged-in user's display name.                                     |
| `metadata`    | `Record<string, unknown>`  | No       | Arbitrary data (plan, role, feature flags, etc.)                   |
| `position`    | `string`                   | No       | Button position. Default: `bottom-right`. Options: `bottom-left`, `bottom-center`, `top-right`, `top-left`, `top-center`, `middle-right`, `middle-left` |
| `themeColor`  | `string`                   | No       | Hex colour for button and accents. Default: `#6366f1`              |

## Step 4: Add to App Component

### Option A: With auth service

If the app has an auth service exposing the current user:

```ts
// app.component.ts
import { Component } from '@angular/core';
import { FeedbackWidgetComponent } from './feedback-widget/feedback-widget.component';
import { AuthService } from './auth/auth.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FeedbackWidgetComponent],
  template: `
    <router-outlet></router-outlet>
    <app-feedback-widget
      [siteKey]="siteKey"
      [apiUrl]="apiUrl"
      [userId]="(auth.currentUser$ | async)?.id"
      [userName]="(auth.currentUser$ | async)?.name"
      [metadata]="{ email: (auth.currentUser$ | async)?.email, role: (auth.currentUser$ | async)?.role }"
    />
  `,
})
export class AppComponent {
  siteKey = environment.feedbackSiteKey;
  apiUrl = environment.feedbackUrl;
  constructor(public auth: AuthService) {}
}
```

### Option B: No auth (anonymous feedback)

If the app has no authentication, simply render the widget without user props:

```ts
// app.component.ts
import { Component } from '@angular/core';
import { FeedbackWidgetComponent } from './feedback-widget/feedback-widget.component';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FeedbackWidgetComponent],
  template: `
    <router-outlet></router-outlet>
    <app-feedback-widget
      [siteKey]="siteKey"
      [apiUrl]="apiUrl"
    />
  `,
})
export class AppComponent {
  siteKey = environment.feedbackSiteKey;
  apiUrl = environment.feedbackUrl;
}
```

## SSR / Angular Universal

If using Angular Universal (SSR), the widget script must only load in the browser. The `ngOnInit` guard in the component (`typeof document !== 'undefined'`) handles this. Additionally, inject `PLATFORM_ID` for a more robust check:

```ts
import { Component, Input, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Inside the component class:
constructor(@Inject(PLATFORM_ID) private platformId: object) {}

ngOnInit(): void {
  if (isPlatformBrowser(this.platformId) &&
      !document.querySelector(`script[src="${this.apiUrl}/widget.js"]`)) {
    const script = document.createElement('script');
    script.src = `${this.apiUrl}/widget.js`;
    script.async = true;
    document.body.appendChild(script);
  }
}
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
