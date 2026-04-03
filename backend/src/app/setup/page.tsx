"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LettsSsoButton, LettsSsoDivider } from "@/components/letts-sso-button";

export default function SetupPage() {
  const router = useRouter();
  const [booting, setBooting] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [lettsSsoReady, setLettsSsoReady] = useState(false);
  const [form, setForm] = useState({
    tenantName: "",
    domain: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    notionApiKey: "",
    notionDbId: "",
    githubToken: "",
    githubRepo: "",
    webhookUrl: "",
    webhookToken: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [siteKey, setSiteKey] = useState("");
  const [siteId, setSiteId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/letts/pending");
        const data = await res.json();
        if (cancelled) return;
        if (data.profile) {
          setLettsSsoReady(true);
          setForm((f) => ({
            ...f,
            adminEmail: data.profile.email,
            adminName: (f.adminName || data.profile.name || "").trim(),
          }));
          setStep(2);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function goToStep2() {
    setError("");
    if (lettsSsoReady) {
      setStep(2);
      return;
    }
    const email = form.adminEmail.trim();
    if (!email) {
      setError("Enter your email, or sign in with LettsGroup.");
      return;
    }
    if (form.adminPassword.trim().length < 8) {
      setError(
        "Use a password of at least 8 characters, or sign in with LettsGroup.",
      );
      return;
    }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Setup failed");
        return;
      }

      setSiteKey(data.siteKey);
      setSiteId(data.siteId);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (siteKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-indigo-50 px-4">
        <div className="w-full max-w-lg text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re all set!</h1>
          <p className="text-gray-600 mb-8">Your account has been created. Here&apos;s your site key:</p>
          <code className="block bg-gray-900 text-emerald-400 rounded-xl p-5 font-mono text-lg mb-8 select-all">
            {siteKey}
          </code>
          <p className="text-sm text-gray-500 mb-2">
            Save this key — you&apos;ll need it to configure the widget on your site.
          </p>
          {siteId && (
            <p className="text-sm text-gray-400 mb-6">
              Site ID: <code className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 select-all">{siteId}</code>
            </p>
          )}
          <button
            onClick={() => router.push("/admin")}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
        <div className="flex flex-col items-center gap-3 text-gray-500 text-sm">
          <div className="h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">
            Step {step} of 2
          </p>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 1 ? "Verify your account" : "Configure your site"}
          </h1>
          <p className="text-gray-500 mt-1">
            {step === 1
              ? "Sign in with LettsGroup or use email and password, then set up your workspace."
              : "Name your site, add allowed domains, and optionally connect integrations."}
          </p>
        </div>

        {step === 1 ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-5">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <LettsSsoButton intent="setup" variant="light" />
            <LettsSsoDivider variant="light" />

            <p className="text-xs text-gray-500 -mt-1">
              After LettsGroup sign-in you&apos;ll continue here automatically to enter your site details (no extra redirect to finish).
            </p>

            {lettsSsoReady ? (
              <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="text-sm font-medium text-emerald-900">LettsGroup verified</p>
                <div>
                  <p className="text-xs text-emerald-800/80">Email</p>
                  <p className="text-sm font-mono text-gray-900">{form.adminEmail}</p>
                </div>
                {form.adminName ? (
                  <div>
                    <p className="text-xs text-emerald-800/80">Name</p>
                    <p className="text-sm text-gray-900">{form.adminName}</p>
                  </div>
                ) : null}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password (optional)
                  </label>
                  <input
                    type="password"
                    value={form.adminPassword}
                    onChange={(e) => update("adminPassword", e.target.value)}
                    minLength={0}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                    placeholder="Add a password to sign in with email too"
                  />
                </div>
              </div>
            ) : (
              <fieldset className="space-y-4">
                <legend className="text-sm font-semibold text-gray-900 mb-1">
                  Or register with email
                </legend>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                  <input
                    type="text"
                    value={form.adminName}
                    onChange={(e) => update("adminName", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => update("adminEmail", e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                  <input
                    type="password"
                    value={form.adminPassword}
                    onChange={(e) => update("adminPassword", e.target.value)}
                    minLength={8}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                    placeholder="At least 8 characters"
                  />
                </div>
              </fieldset>
            )}

            <button
              type="button"
              onClick={goToStep2}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Continue to site setup
            </button>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <a href="/admin/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Sign in
              </a>
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-5"
          >
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setError("");
                setStep(1);
              }}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              <span aria-hidden>←</span> Back to account
            </button>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-gray-900 mb-2">Your site</legend>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Site name *</label>
                <input
                  type="text"
                  value={form.tenantName}
                  onChange={(e) => update("tenantName", e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                  placeholder="My Awesome App"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Allowed domains</label>
                <input
                  type="text"
                  value={form.domain}
                  onChange={(e) => update("domain", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                  placeholder="example.com, staging.example.com"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Comma-separated. Subdomains are matched automatically. Used to verify the widget is only called from your site.
                </p>
              </div>
            </fieldset>

            <fieldset className="space-y-4 pt-4 border-t border-gray-100">
              <legend className="text-sm font-semibold text-gray-900 mb-1">Notion integration (optional)</legend>
              <p className="text-xs text-gray-400 mb-2">
                Connect a Notion database to automatically sync feedback as pages.
                You can also configure this later in Settings.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notion API key</label>
                <input
                  type="password"
                  value={form.notionApiKey}
                  onChange={(e) => update("notionApiKey", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                  placeholder="ntn_..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notion database ID</label>
                <input
                  type="text"
                  value={form.notionDbId}
                  onChange={(e) => update("notionDbId", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                  placeholder="abc123def456..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  The 32-character ID from your Notion database URL
                </p>
              </div>
            </fieldset>

            <fieldset className="space-y-4 pt-4 border-t border-gray-100">
              <legend className="text-sm font-semibold text-gray-900 mb-1">GitHub integration (optional)</legend>
              <p className="text-xs text-gray-400 mb-2">
                Create GitHub issues automatically for each feedback submission.
                Provide a Personal Access Token with <code className="bg-gray-100 px-1 py-0.5 rounded">repo</code> scope.
                You can also configure this later in Settings.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">GitHub token</label>
                <input
                  type="password"
                  value={form.githubToken}
                  onChange={(e) => update("githubToken", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                  placeholder="ghp_... or github_pat_..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Repository</label>
                <input
                  type="text"
                  value={form.githubRepo}
                  onChange={(e) => update("githubRepo", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900 font-mono"
                  placeholder="owner/repo"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Format: owner/repository-name (e.g. acme/my-app)
                </p>
              </div>
            </fieldset>

            <fieldset className="space-y-4 pt-4 border-t border-gray-100">
              <legend className="text-sm font-semibold text-gray-900 mb-1">Webhook integration (optional)</legend>
              <p className="text-xs text-gray-400 mb-2">
                Send a webhook when new feedback is received.
                Provide a callback URL and bearer token for authorization.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Callback URL</label>
                <input
                  type="url"
                  value={form.webhookUrl}
                  onChange={(e) => update("webhookUrl", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                  placeholder="https://example.com/webhooks/feedback"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bearer token</label>
                <input
                  type="password"
                  value={form.webhookToken}
                  onChange={(e) => update("webhookToken", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                  placeholder="whsec_..."
                />
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create account"}
            </button>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <a href="/admin/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Sign in
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
