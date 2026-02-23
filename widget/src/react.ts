/**
 * React JSX type augmentation for <feedback-widget>.
 *
 * Import this module once in your project (e.g. in a .d.ts file or your root component):
 *
 *   import "@webfeedback/widget/react";
 *
 * This adds <feedback-widget> to React's JSX.IntrinsicElements so TypeScript
 * accepts it in JSX without errors.
 */

import type { FeedbackWidget, FeedbackWidgetAttributes } from "./index";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace React.JSX {
    interface IntrinsicElements {
      "feedback-widget": React.DetailedHTMLProps<
        React.HTMLAttributes<FeedbackWidget> & FeedbackWidgetAttributes,
        FeedbackWidget
      >;
    }
  }
}
