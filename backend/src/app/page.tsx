import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <nav className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">WebFeedback</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/login"
            className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/setup"
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 pt-20 pb-32">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
            Collect feedback from
            <span className="text-indigo-600"> any website</span> with one line
            of code
          </h1>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            Drop a beautiful feedback widget into your site. Users can report
            bugs, request features, and share thoughts — complete with automatic
            screenshots. Review everything in your admin dashboard.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/setup"
              className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Create Your Account
            </Link>
            <a
              href="#embed"
              className="text-gray-700 px-8 py-3.5 rounded-xl font-semibold text-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              See How It Works
            </a>
          </div>
        </div>

        <div
          id="embed"
          className="mt-32 bg-white rounded-2xl shadow-xl border border-gray-100 p-10 max-w-3xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Add to your site in seconds
          </h2>
          <p className="text-gray-600 mb-6">
            Just paste this snippet before your closing{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">
              &lt;/body&gt;
            </code>{" "}
            tag:
          </p>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-6 text-sm overflow-x-auto font-mono leading-relaxed">
            {`<script src="https://your-domain.com/widget.js"><\/script>
<feedback-widget
  site-key="YOUR_SITE_KEY"
  api-url="https://your-domain.com"
  position="bottom-right"
></feedback-widget>`}
          </pre>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">
                Auto Screenshots
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Captures the page automatically when feedback is opened
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Multi-Tenant</h3>
              <p className="text-sm text-gray-500 mt-1">
                Each site gets its own dashboard and API key
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Custom Metadata</h3>
              <p className="text-sm text-gray-500 mt-1">
                Attach any data — user info, page context, app state
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
