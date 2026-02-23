"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
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
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [siteKey, setSiteKey] = useState("");
  const [siteId, setSiteId] = useState("");

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-1">Set up your feedback collection in seconds</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">{error}</div>
          )}

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-gray-900 mb-2">Your Site</legend>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Site Name *</label>
              <input
                type="text" value={form.tenantName} onChange={(e) => update("tenantName", e.target.value)} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                placeholder="My Awesome App"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Allowed Domains</label>
              <input
                type="text" value={form.domain} onChange={(e) => update("domain", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                placeholder="example.com, staging.example.com"
              />
              <p className="text-xs text-gray-400 mt-1">
                Comma-separated. Subdomains are matched automatically. Used to verify the widget is only called from your site.
              </p>
            </div>
          </fieldset>

          <fieldset className="space-y-4 pt-4 border-t border-gray-100">
            <legend className="text-sm font-semibold text-gray-900 mb-2">Admin Account</legend>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input
                type="text" value={form.adminName} onChange={(e) => update("adminName", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
              <input
                type="email" value={form.adminEmail} onChange={(e) => update("adminEmail", e.target.value)} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
              <input
                type="password" value={form.adminPassword} onChange={(e) => update("adminPassword", e.target.value)} required minLength={8}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                placeholder="••••••••"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4 pt-4 border-t border-gray-100">
            <legend className="text-sm font-semibold text-gray-900 mb-1">Notion Integration (optional)</legend>
            <p className="text-xs text-gray-400 mb-2">
              Connect a Notion database to automatically sync feedback as pages.
              You can also configure this later in Settings.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notion API Key</label>
              <input
                type="password" value={form.notionApiKey} onChange={(e) => update("notionApiKey", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                placeholder="ntn_..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notion Database ID</label>
              <input
                type="text" value={form.notionDbId} onChange={(e) => update("notionDbId", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                placeholder="abc123def456..."
              />
              <p className="text-xs text-gray-400 mt-1">
                The 32-character ID from your Notion database URL
              </p>
            </div>
          </fieldset>

          <fieldset className="space-y-4 pt-4 border-t border-gray-100">
            <legend className="text-sm font-semibold text-gray-900 mb-1">GitHub Integration (optional)</legend>
            <p className="text-xs text-gray-400 mb-2">
              Create GitHub issues automatically for each feedback submission.
              Provide a Personal Access Token with <code className="bg-gray-100 px-1 py-0.5 rounded">repo</code> scope.
              You can also configure this later in Settings.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">GitHub Token</label>
              <input
                type="password" value={form.githubToken} onChange={(e) => update("githubToken", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                placeholder="ghp_... or github_pat_..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Repository</label>
              <input
                type="text" value={form.githubRepo} onChange={(e) => update("githubRepo", e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900 font-mono"
                placeholder="owner/repo"
              />
              <p className="text-xs text-gray-400 mt-1">
                Format: owner/repository-name (e.g. acme/my-app)
              </p>
            </div>
          </fieldset>

          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <a href="/admin/login" className="text-indigo-600 hover:text-indigo-700 font-medium">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  );
}
