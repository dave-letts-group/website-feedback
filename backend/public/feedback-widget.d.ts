/**
 * Type declarations for the <feedback-widget> Web Component (script-tag usage).
 *
 * If you installed via npm, you don't need this file — types ship with the package.
 *
 * For script-tag usage, copy this file into your project and add it to tsconfig.json:
 *   "include": ["types/feedback-widget.d.ts", ...]
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
  /** JSON-encoded string of arbitrary metadata. */
  metadata?: string;
  /** Hex colour for the button and accent elements. Default: "#6366f1". */
  "theme-color"?: string;
  /** When present, hides the floating trigger button. Use `.open()` to show the modal programmatically. */
  "hide-trigger"?: string | boolean;
}

export interface FeedbackWidgetElement extends HTMLElement {
  /** Open the feedback modal. */
  open(): void;
  /** Close the feedback modal. */
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
