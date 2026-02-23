# WebFeedback -- Angular Integration Guide

You are integrating the **WebFeedback** widget into an Angular 13+ application. WebFeedback is a drop-in feedback widget (Web Component with Shadow DOM) that captures user feedback with automatic screenshots, categories, star ratings, and arbitrary metadata. It submits feedback to a hosted backend via a REST API authenticated by a per-site key.

## Configuration

Replace placeholders before starting:

| Placeholder              | Description                                      | Example                                    |
|--------------------------|--------------------------------------------------|--------------------------------------------|
| `FEEDBACK_URL`           | WebFeedback backend URL                          | `https://web-feedback.vercel.app`          |
| `FEEDBACK_SITE_KEY`      | Site key from the WebFeedback admin dashboard     | `cmxxxxxxxxxxxxxxxxxxxxxx`                 |

## Step 1: Environment Variables

Add to `src/environments/environment.ts` and `src/environments/environment.prod.ts`:

```ts
// src/environments/environment.ts
export const environment = {
  production: false,
  feedbackUrl: "FEEDBACK_URL",
  feedbackSiteKey: "FEEDBACK_SITE_KEY",
};
```

```ts
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  feedbackUrl: "FEEDBACK_URL",
  feedbackSiteKey: "FEEDBACK_SITE_KEY",
};
```

## Step 2: Allow Custom Elements in Angular

Angular will throw a template error if it encounters an unknown element like `<feedback-widget>`. Tell it to expect Web Components by adding `CUSTOM_ELEMENTS_SCHEMA` to your root module (or the module where the widget is used).

**Edit `src/app/app.module.ts`:**

```ts
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { AppComponent } from "./app.component";

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

> **Note:** If you are using standalone components (Angular 14+), add `schemas: [CUSTOM_ELEMENTS_SCHEMA]` to the `@Component` decorator of the component that renders `<feedback-widget>` instead.

## Step 3: TypeScript Declaration

Create a type declaration file so TypeScript recognises the `<feedback-widget>` custom element and provides correct types for `querySelector`.

**Download `feedback-widget.d.ts` from your WebFeedback instance:**

```bash
curl -o src/types/feedback-widget.d.ts FEEDBACK_URL/feedback-widget.d.ts
```

Or create `src/types/feedback-widget.d.ts` manually:

```ts
interface FeedbackWidgetAttributes {
  "site-key": string;
  "api-url": string;
  position?: string;
  "user-id"?: string;
  "user-name"?: string;
  "page-title"?: string;
  "page-id"?: string;
  metadata?: string;
  "theme-color"?: string;
  "hide-trigger"?: boolean | string;
}

interface FeedbackWidgetElement extends HTMLElement, FeedbackWidgetAttributes {
  open(): void;
  close(): void;
}

declare global {
  interface HTMLElementTagNameMap {
    "feedback-widget": FeedbackWidgetElement;
  }
}

export {};
```

Ensure `src/types` is included in `tsconfig.app.json`:

```json
{
  "include": ["src/**/*.ts", "src/types/**/*.d.ts"]
}
```

## Step 4: FeedbackWidget Component

Create an Angular component that loads the widget script and renders the custom element.

**Generate the component:**

```bash
ng generate component feedback-widget --skip-tests
```

**Replace `src/app/feedback-widget/feedback-widget.component.ts`:**

```ts
import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from "@angular/core";

@Component({
  selector: "app-feedback-widget",
  template: `
    <feedback-widget
      #widget
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
export class FeedbackWidgetComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() siteKey!: string;
  @Input() apiUrl!: string;
  @Input() userId?: string;
  @Input() userName?: string;
  @Input() metadata?: Record<string, unknown>;
  @Input() position: string = "bottom-right";
  @Input() themeColor?: string;

  @ViewChild("widget") widgetRef!: ElementRef<FeedbackWidgetElement>;

  get metadataJson(): string | null {
    return this.metadata ? JSON.stringify(this.metadata) : null;
  }

  ngOnInit(): void {
    this.loadScript();
  }

  ngAfterViewInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {}

  private loadScript(): void {
    const src = `${this.apiUrl}/widget.js`;
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    document.body.appendChild(script);
  }

  open(): void {
    this.widgetRef?.nativeElement?.open();
  }

  close(): void {
    this.widgetRef?.nativeElement?.close();
  }
}
```

### Input reference

| Input         | Type                       | Required | Description                                                        |
|---------------|----------------------------|----------|--------------------------------------------------------------------|
| `siteKey`     | `string`                   | Yes      | Site key from the admin dashboard                                  |
| `apiUrl`      | `string`                   | Yes      | WebFeedback backend URL                                            |
| `userId`      | `string`                   | No       | Logged-in user's ID. Attached to each feedback submission.         |
| `userName`    | `string`                   | No       | Logged-in user's display name.                                     |
| `metadata`    | `Record<string, unknown>`  | No       | Arbitrary data (plan, role, feature flags, etc.)                   |
| `position`    | `string`                   | No       | Button position. Default: `bottom-right`. Options: `bottom-left`, `bottom-center`, `top-right`, `top-left`, `top-center`, `middle-right`, `middle-left` |
| `themeColor`  | `string`                   | No       | Hex colour for button and accents. Default: `#6366f1`              |

## Step 5: Add to App Component

Wire the component into the root app component so the widget appears on every page.

### Option A: No auth (anonymous feedback)

```ts
// src/app/app.component.ts
import { Component } from "@angular/core";
import { environment } from "../environments/environment";

@Component({
  selector: "app-root",
  template: `
    <router-outlet></router-outlet>
    <app-feedback-widget
      [siteKey]="feedbackSiteKey"
      [apiUrl]="feedbackUrl"
    ></app-feedback-widget>
  `,
})
export class AppComponent {
  feedbackUrl = environment.feedbackUrl;
  feedbackSiteKey = environment.feedbackSiteKey;
}
```

### Option B: With auth service

If the app has an auth service that exposes the current user:

```ts
// src/app/app.component.ts
import { Component, OnInit } from "@angular/core";
import { environment } from "../environments/environment";
import { AuthService } from "./core/auth.service"; // replace with your auth service

@Component({
  selector: "app-root",
  template: `
    <router-outlet></router-outlet>
    <app-feedback-widget
      [siteKey]="feedbackSiteKey"
      [apiUrl]="feedbackUrl"
      [userId]="userId"
      [userName]="userName"
      [metadata]="metadata"
    ></app-feedback-widget>
  `,
})
export class AppComponent implements OnInit {
  feedbackUrl = environment.feedbackUrl;
  feedbackSiteKey = environment.feedbackSiteKey;

  userId?: string;
  userName?: string;
  metadata?: Record<string, unknown>;

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.auth.currentUser$.subscribe((user) => {
      this.userId = user?.id;
      this.userName = user?.name;
      this.metadata = user ? { email: user.email, role: user.role } : undefined;
    });
  }
}
```

### Option C: Programmatic trigger (hide the floating button)

If you want to trigger the widget from your own UI element rather than the default floating button:

```ts
// src/app/app.component.ts
import { Component, ViewChild } from "@angular/core";
import { environment } from "../environments/environment";
import { FeedbackWidgetComponent } from "./feedback-widget/feedback-widget.component";

@Component({
  selector: "app-root",
  template: `
    <router-outlet></router-outlet>
    <button (click)="openFeedback()">Send Feedback</button>
    <app-feedback-widget
      #feedbackWidget
      [siteKey]="feedbackSiteKey"
      [apiUrl]="feedbackUrl"
      [attr.hide-trigger]="true"
    ></app-feedback-widget>
  `,
})
export class AppComponent {
  @ViewChild("feedbackWidget") feedbackWidget!: FeedbackWidgetComponent;

  feedbackUrl = environment.feedbackUrl;
  feedbackSiteKey = environment.feedbackSiteKey;

  openFeedback(): void {
    this.feedbackWidget.open();
  }
}
```

## How it works

- The widget script loads asynchronously and registers a `<feedback-widget>` Web Component.
- It uses Shadow DOM so its styles never conflict with the Angular application.
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
