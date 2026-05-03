/// <reference types="react" />

/**
 * JSX types for <feedback-widget> in Next.js / React apps.
 *
 * Ensure this file is part of compilation (e.g. tsconfig "include":
 * "src/**/*.ts", "src/**/*.tsx", "src/**/*.d.ts" — or list this path explicitly).
 *
 * Copy into your admin-portal repo if it lives outside this monorepo.
 */

export type FeedbackWidgetPosition =
  | "bottom-right"
  | "bottom-left"
  | "bottom-center"
  | "top-right"
  | "top-left"
  | "top-center"
  | "middle-right"
  | "middle-left";

export interface FeedbackWidgetAttributes {
  "site-key"?: string;
  "api-url"?: string;
  position?: FeedbackWidgetPosition;
  "page-title"?: string;
  "page-id"?: string;
  "user-id"?: string;
  "user-name"?: string;
  metadata?: string;
  "theme-color"?: string;
  "hide-trigger"?: string | boolean;
}

export interface FeedbackWidgetElement extends HTMLElement {
  open(): void;
  close(): void;
}

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
