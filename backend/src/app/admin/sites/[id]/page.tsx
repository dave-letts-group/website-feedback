"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

interface SiteData {
  id: string;
  name: string;
  domain: string | null;
  siteKey: string;
  notionApiKey: string | null;
  notionDbId: string | null;
  notionEnabled: boolean;
  githubToken: string | null;
  githubRepo: string | null;
  githubEnabled: boolean;
  webhookUrl: string | null;
  webhookToken: string | null;
  webhookEnabled: boolean;
  createdAt: string;
}

export default function SiteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const siteId = params.id as string;

  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Notion state
  const [notionEditing, setNotionEditing] = useState(false);
  const [notionApiKey, setNotionApiKey] = useState("");
  const [notionDbId, setNotionDbId] = useState("");
  const [notionSaving, setNotionSaving] = useState(false);

  // GitHub state
  const [githubEditing, setGithubEditing] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [githubSaving, setGithubSaving] = useState(false);

  // Webhook state
  const [webhookEditing, setWebhookEditing] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [webhookSaving, setWebhookSaving] = useState(false);

  const fetchSite = useCallback(async () => {
    try {
      const res = await fetch(`/api/sites/${siteId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load site");
        return;
      }
      setSite(data.site);
      setName(data.site.name);
      setDomain(data.site.domain || "");
      setNotionDbId(data.site.notionDbId || "");
      setGithubRepo(data.site.githubRepo || "");
      setWebhookUrl(data.site.webhookUrl || "");
    } catch {
      setError("Failed to load site");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchSite();
  }, [fetchSite]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setSaving(true);

    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain: domain || null }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }

      setSite(data.site);
      setSuccess("Site details saved");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this site? All feedback for this site will also be deleted. This cannot be undone.")) return;
    clearMessages();
    setDeleting(true);

    try {
      const res = await fetch(`/api/sites/${siteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete site");
        setDeleting(false);
        return;
      }
      router.push("/admin/sites");
    } catch {
      setError("Network error");
      setDeleting(false);
    }
  }

  async function handleNotionSave() {
    clearMessages();

    if (notionApiKey && !notionDbId) {
      setError("Database ID is required when setting an API key");
      return;
    }
    const hasExistingKey = site?.notionApiKey && site.notionApiKey !== "null";
    if (notionDbId && !notionApiKey && !hasExistingKey) {
      setError("API key is required when setting a database ID");
      return;
    }

    setNotionSaving(true);
    try {
      const body: Record<string, string> = { notionDbId };
      if (notionApiKey) body.notionApiKey = notionApiKey;

      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save Notion settings");
        return;
      }

      setSite(data.site);
      setSuccess("Notion settings saved and verified");
      setNotionEditing(false);
      setNotionApiKey("");
    } catch {
      setError("Network error");
    } finally {
      setNotionSaving(false);
    }
  }

  async function handleNotionDisconnect() {
    clearMessages();
    setNotionSaving(true);
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notionApiKey: null, notionDbId: null }),
      });
      const data = await res.json();
      if (res.ok) {
        setSite(data.site);
        setSuccess("Notion disconnected");
        setNotionEditing(false);
        setNotionApiKey("");
        setNotionDbId("");
      }
    } catch {
      setError("Network error");
    } finally {
      setNotionSaving(false);
    }
  }

  async function handleNotionToggle(enabled: boolean) {
    clearMessages();
    setNotionSaving(true);
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notionEnabled: enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update Notion status");
        return;
      }
      setSite(data.site);
      setSuccess(enabled ? "Notion integration enabled" : "Notion integration disabled");
    } catch {
      setError("Network error");
    } finally {
      setNotionSaving(false);
    }
  }

  async function handleGithubSave() {
    clearMessages();

    if (githubToken && !githubRepo) {
      setError("Repository is required when setting a token");
      return;
    }
    const hasExistingToken = site?.githubToken && site.githubToken !== "null";
    if (githubRepo && !githubToken && !hasExistingToken) {
      setError("Token is required when setting a repository");
      return;
    }

    setGithubSaving(true);
    try {
      const body: Record<string, string> = { githubRepo };
      if (githubToken) body.githubToken = githubToken;

      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save GitHub settings");
        return;
      }

      setSite(data.site);
      setSuccess("GitHub settings saved and verified");
      setGithubEditing(false);
      setGithubToken("");
    } catch {
      setError("Network error");
    } finally {
      setGithubSaving(false);
    }
  }

  async function handleGithubDisconnect() {
    clearMessages();
    setGithubSaving(true);
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubToken: null, githubRepo: null }),
      });
      const data = await res.json();
      if (res.ok) {
        setSite(data.site);
        setSuccess("GitHub disconnected");
        setGithubEditing(false);
        setGithubToken("");
        setGithubRepo("");
      }
    } catch {
      setError("Network error");
    } finally {
      setGithubSaving(false);
    }
  }

  async function handleGithubToggle(enabled: boolean) {
    clearMessages();
    setGithubSaving(true);
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubEnabled: enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update GitHub status");
        return;
      }
      setSite(data.site);
      setSuccess(enabled ? "GitHub integration enabled" : "GitHub integration disabled");
    } catch {
      setError("Network error");
    } finally {
      setGithubSaving(false);
    }
  }

  async function handleWebhookSave() {
    clearMessages();

    if (webhookToken && !webhookUrl) {
      setError("Webhook callback URL is required when setting a bearer token");
      return;
    }
    const hasExistingToken = site?.webhookToken && site.webhookToken !== "null";
    if (webhookUrl && !webhookToken && !hasExistingToken) {
      setError("Webhook bearer token is required when setting a callback URL");
      return;
    }

    setWebhookSaving(true);
    try {
      const body: Record<string, string> = { webhookUrl };
      if (webhookToken) body.webhookToken = webhookToken;

      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save webhook settings");
        return;
      }

      setSite(data.site);
      setSuccess("Webhook settings saved and verified");
      setWebhookEditing(false);
      setWebhookToken("");
    } catch {
      setError("Network error");
    } finally {
      setWebhookSaving(false);
    }
  }

  async function handleWebhookDisconnect() {
    clearMessages();
    setWebhookSaving(true);
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: null, webhookToken: null }),
      });
      const data = await res.json();
      if (res.ok) {
        setSite(data.site);
        setSuccess("Webhook disconnected");
        setWebhookEditing(false);
        setWebhookToken("");
        setWebhookUrl("");
      } else {
        setError(data.error || "Failed to disconnect webhook");
      }
    } catch {
      setError("Network error");
    } finally {
      setWebhookSaving(false);
    }
  }

  async function handleWebhookVerify() {
    clearMessages();
    setWebhookSaving(true);
    try {
      const body: Record<string, string> = {};
      if (webhookEditing) {
        if (webhookUrl) body.webhookUrl = webhookUrl;
        if (webhookToken) body.webhookToken = webhookToken;
      }

      const res = await fetch(`/api/sites/${siteId}/webhook/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Webhook verification failed");
        return;
      }

      setSuccess(data.message || "Webhook verification succeeded");
    } catch {
      setError("Network error");
    } finally {
      setWebhookSaving(false);
    }
  }

  async function handleWebhookToggle(enabled: boolean) {
    clearMessages();
    setWebhookSaving(true);
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookEnabled: enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update webhook status");
        return;
      }
      setSite(data.site);
      setSuccess(enabled ? "Webhook integration enabled" : "Webhook integration disabled");
    } catch {
      setError("Network error");
    } finally {
      setWebhookSaving(false);
    }
  }

  function copySiteKey() {
    if (!site) return;
    navigator.clipboard.writeText(site.siteKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  function copyEmbedCode() {
    if (!site) return;
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  }

  const backendUrl = typeof window !== "undefined" ? window.location.origin : "";
  const embedCode = site
    ? `<script src="${backendUrl}/widget.js"><\/script>\n<feedback-widget\n  site-key="${site.siteKey}"\n  api-url="${backendUrl}"\n  position="bottom-right"\n></feedback-widget>`
    : "";

  const notionConnected = site?.notionApiKey && site.notionApiKey !== "null" && site?.notionDbId;
  const githubConnected = site?.githubToken && site.githubToken !== "null" && site?.githubRepo;
  const webhookConnected = site?.webhookToken && site.webhookToken !== "null" && site?.webhookUrl;

  if (loading) {
    return (
      <div className="p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Site Details</h1>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
          <p className="mt-3">Loading...</p>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="p-8 max-w-3xl">
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
          {error || "Site not found"}
        </div>
        <button
          onClick={() => router.push("/admin/sites")}
          className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Back to Sites
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/sites")}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Site configuration and integrations</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100 mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-3 rounded-lg border border-emerald-100 mb-4">
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* Site Details */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Site Details</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Domain</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">
                Requests from other origins will be rejected. Subdomains are matched automatically.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Site Key */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Site Key</h2>
          <p className="text-sm text-gray-500 mb-4">
            This key identifies your site. Include it in the widget configuration.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-mono text-sm text-gray-800 select-all">
              {site.siteKey}
            </code>
            <button
              onClick={copySiteKey}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {copiedKey ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Embed Code */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Embed Code</h2>
            <button
              onClick={copyEmbedCode}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {copiedEmbed ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Paste this snippet before the closing{" "}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">&lt;/body&gt;</code>{" "}
            tag of your website.
          </p>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 text-sm overflow-x-auto font-mono leading-relaxed select-all">
            {embedCode}
          </pre>
        </div>

        {/* Notion Integration */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.03 2.205c-.467-.373-.84-.187-1.96-.093L3.2 2.952c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.84c-.56.047-.747.327-.747.98zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.747 0-.933-.234-1.494-.934l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.222.187c-.093-.186 0-.653.327-.746l.84-.233V8.756l-1.168-.093c-.093-.42.14-1.026.793-1.073l3.456-.234 4.764 7.28V8.57l-1.215-.14c-.093-.514.28-.886.747-.933zM2.723 1.355l13.308-.84c1.635-.14 2.055-.047 3.082.7l4.25 2.986c.7.513.933.653.933 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.046-1.448-.094-1.962-.747L1.15 18.473c-.56-.747-.793-1.306-.793-1.96V2.895c0-.84.373-1.494 1.307-1.587z"/>
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">Notion Integration</h2>
            </div>
            {notionConnected && (
              <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${site.notionEnabled ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${site.notionEnabled ? "bg-emerald-500" : "bg-amber-500"}`} />
                {site.notionEnabled ? "Enabled" : "Disabled"}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Sync feedback to a Notion database automatically. Each submission creates a new page.
          </p>

          {!notionEditing ? (
            <div className="space-y-3">
              <dl className="text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <dt className="text-gray-400 font-medium">API Key</dt>
                  <dd className="text-gray-700 font-mono text-xs">
                    {site.notionApiKey && site.notionApiKey !== "null" ? site.notionApiKey : "Not set"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-gray-400 font-medium">Database ID</dt>
                  <dd className="text-gray-700 font-mono text-xs truncate max-w-[200px]">
                    {site.notionDbId || "Not set"}
                  </dd>
                </div>
              </dl>
              <button
                onClick={() => setNotionEditing(true)}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {notionConnected ? "Update credentials" : "Configure Notion"}
              </button>
              {notionConnected && (
                <button
                  onClick={() => handleNotionToggle(!site.notionEnabled)}
                  disabled={notionSaving}
                  className="ml-4 text-sm text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50"
                >
                  {notionSaving
                    ? "Saving..."
                    : site.notionEnabled
                      ? "Disable integration"
                      : "Enable integration"}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notion API Key {notionConnected ? "(leave blank to keep current)" : ""}
                </label>
                <input
                  type="password"
                  value={notionApiKey}
                  onChange={(e) => setNotionApiKey(e.target.value)}
                  placeholder="ntn_..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Database ID</label>
                <input
                  type="text"
                  value={notionDbId}
                  onChange={(e) => setNotionDbId(e.target.value)}
                  placeholder="abc123def456..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">The 32-character ID from your database URL</p>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleNotionSave}
                  disabled={notionSaving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {notionSaving ? "Verifying..." : "Save & Verify"}
                </button>
                <button
                  onClick={() => { setNotionEditing(false); clearMessages(); }}
                  className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-800"
                >
                  Cancel
                </button>
                {notionConnected && (
                  <button
                    onClick={handleNotionDisconnect}
                    disabled={notionSaving}
                    className="ml-auto px-4 py-2 text-red-600 text-sm font-medium hover:text-red-700 disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Required Notion database properties
                </p>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1 font-mono">
                  <p>Name <span className="text-gray-400">(title)</span></p>
                  <p>Message <span className="text-gray-400">(rich_text)</span></p>
                  <p>Category <span className="text-gray-400">(select: Bug, Feature, General)</span></p>
                  <p>Status <span className="text-gray-400">(select: new, reviewed, archived)</span></p>
                  <p>Rating <span className="text-gray-400">(number)</span></p>
                  <p>Submitted Date <span className="text-gray-400">(date)</span></p>
                  <p>Page Title <span className="text-gray-400">(rich_text)</span></p>
                  <p>Page URL <span className="text-gray-400">(url)</span></p>
                  <p>User Name <span className="text-gray-400">(rich_text)</span></p>
                  <p>User ID <span className="text-gray-400">(rich_text)</span></p>
                  <p>Metadata <span className="text-gray-400">(rich_text)</span></p>
                  <p>Admin Link <span className="text-gray-400">(url)</span></p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* GitHub Integration */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">GitHub Integration</h2>
            </div>
            {githubConnected && (
              <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${site.githubEnabled ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${site.githubEnabled ? "bg-emerald-500" : "bg-amber-500"}`} />
                {site.githubEnabled ? "Enabled" : "Disabled"}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Create GitHub issues automatically for each feedback submission.
          </p>

          {!githubEditing ? (
            <div className="space-y-3">
              <dl className="text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <dt className="text-gray-400 font-medium">Token</dt>
                  <dd className="text-gray-700 font-mono text-xs">
                    {site.githubToken && site.githubToken !== "null" ? site.githubToken : "Not set"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-gray-400 font-medium">Repository</dt>
                  <dd className="text-gray-700 font-mono text-xs truncate max-w-[200px]">
                    {site.githubRepo || "Not set"}
                  </dd>
                </div>
              </dl>
              <button
                onClick={() => setGithubEditing(true)}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {githubConnected ? "Update credentials" : "Configure GitHub"}
              </button>
              {githubConnected && (
                <button
                  onClick={() => handleGithubToggle(!site.githubEnabled)}
                  disabled={githubSaving}
                  className="ml-4 text-sm text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50"
                >
                  {githubSaving
                    ? "Saving..."
                    : site.githubEnabled
                      ? "Disable integration"
                      : "Enable integration"}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Access Token {githubConnected ? "(leave blank to keep current)" : ""}
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_... or github_pat_..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Requires <code className="bg-gray-100 px-1 py-0.5 rounded">repo</code> scope
                  (classic) or <code className="bg-gray-100 px-1 py-0.5 rounded">Issues: Read and write</code> permission
                  (fine-grained)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repository</label>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="owner/repo"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Format: owner/repository-name (e.g. acme/my-app)
                </p>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleGithubSave}
                  disabled={githubSaving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {githubSaving ? "Verifying..." : "Save & Verify"}
                </button>
                <button
                  onClick={() => { setGithubEditing(false); clearMessages(); }}
                  className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-800"
                >
                  Cancel
                </button>
                {githubConnected && (
                  <button
                    onClick={handleGithubDisconnect}
                    disabled={githubSaving}
                    className="ml-auto px-4 py-2 text-red-600 text-sm font-medium hover:text-red-700 disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">How it works</p>
                <ul className="text-xs text-gray-500 space-y-1.5 list-disc list-inside">
                  <li>Each feedback submission creates a new GitHub issue</li>
                  <li>Category maps to labels: bug, enhancement, or feedback</li>
                  <li>Issue body includes all feedback details and metadata</li>
                  <li>A link back to the admin portal is included</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Webhook Integration */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-3 3 3 3M16 9l3 3-3 3M13 7l-2 10" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">Webhook Integration</h2>
            </div>
            {webhookConnected && (
              <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${site.webhookEnabled ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${site.webhookEnabled ? "bg-emerald-500" : "bg-amber-500"}`} />
                {site.webhookEnabled ? "Enabled" : "Disabled"}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Send a JSON payload of the feedback object to your callback URL whenever feedback is received.
          </p>

          {!webhookEditing ? (
            <div className="space-y-3">
              <dl className="text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <dt className="text-gray-400 font-medium">Callback URL</dt>
                  <dd className="text-gray-700 font-mono text-xs truncate max-w-[280px]">
                    {site.webhookUrl || "Not set"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-gray-400 font-medium">Bearer Token</dt>
                  <dd className="text-gray-700 font-mono text-xs">
                    {site.webhookToken && site.webhookToken !== "null" ? site.webhookToken : "Not set"}
                  </dd>
                </div>
              </dl>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setWebhookEditing(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {webhookConnected ? "Update webhook" : "Configure webhook"}
                </button>
                {webhookConnected && (
                  <button
                    onClick={() => handleWebhookToggle(!site.webhookEnabled)}
                    disabled={webhookSaving}
                    className="text-sm text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50"
                  >
                    {webhookSaving
                      ? "Saving..."
                      : site.webhookEnabled
                        ? "Disable integration"
                        : "Enable integration"}
                  </button>
                )}
                {webhookConnected && (
                  <button
                    onClick={handleWebhookVerify}
                    disabled={webhookSaving}
                    className="text-sm text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50"
                  >
                    {webhookSaving ? "Verifying..." : "Verify now"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Callback URL
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://example.com/webhooks/feedback"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bearer Token {webhookConnected ? "(leave blank to keep current)" : ""}
                </label>
                <input
                  type="password"
                  value={webhookToken}
                  onChange={(e) => setWebhookToken(e.target.value)}
                  placeholder="whsec_..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleWebhookSave}
                  disabled={webhookSaving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {webhookSaving ? "Verifying..." : "Save & Verify"}
                </button>
                <button
                  onClick={handleWebhookVerify}
                  disabled={webhookSaving}
                  className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-800 disabled:opacity-50"
                >
                  Verify only
                </button>
                <button
                  onClick={() => { setWebhookEditing(false); setWebhookToken(""); clearMessages(); }}
                  className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-800"
                >
                  Cancel
                </button>
                {webhookConnected && (
                  <button
                    onClick={handleWebhookDisconnect}
                    disabled={webhookSaving}
                    className="ml-auto px-4 py-2 text-red-600 text-sm font-medium hover:text-red-700 disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Widget Attributes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Widget Attributes</h2>
          <p className="text-sm text-gray-500 mb-4">
            Configure the widget by adding attributes to the{" "}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">&lt;feedback-widget&gt;</code>{" "}
            element. Values set at the time of submission are sent with the feedback.
          </p>

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Required</h3>
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-2 font-medium text-gray-500">Attribute</th>
                <th className="pb-2 font-medium text-gray-500">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ["site-key", "Your unique site identifier"],
                ["api-url", "Backend URL where feedback is submitted"],
              ].map(([attr, desc]) => (
                <tr key={attr}>
                  <td className="py-2.5 pr-4">
                    <code className="bg-gray-50 px-1.5 py-0.5 rounded text-xs font-mono text-indigo-600">{attr}</code>
                  </td>
                  <td className="py-2.5 text-gray-600">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Optional — Context &amp; Appearance
          </h3>
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-2 font-medium text-gray-500">Attribute</th>
                <th className="pb-2 font-medium text-gray-500">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ["page-title", "Current page title. Falls back to document.title if not set."],
                ["page-id", "Your internal page or route identifier"],
                ["user-id", "Logged-in user\u2019s ID from your auth system"],
                ["user-name", "Logged-in user\u2019s display name"],
                ["metadata", "JSON string of arbitrary key-value data (e.g. plan, version, feature flags)"],
                ["position", "Button position: bottom-right (default), bottom-left, bottom-center, top-right, top-left, top-center, middle-right, middle-left"],
                ["theme-color", "Primary colour hex code (default: #6366f1)"],
                ["hide-trigger", "Hide the floating button. Use widget.open() from your own UI instead."],
              ].map(([attr, desc]) => (
                <tr key={attr}>
                  <td className="py-2.5 pr-4 align-top">
                    <code className="bg-gray-50 px-1.5 py-0.5 rounded text-xs font-mono text-indigo-600 whitespace-nowrap">{attr}</code>
                  </td>
                  <td className="py-2.5 text-gray-600">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Optional &#x2014; Screenshot Capture
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            The modal opens instantly. Screenshot capture runs asynchronously in the background and never blocks interactivity.
            On timeout or error, the modal shows a non-blocking hint and submission still works normally.
          </p>
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-2 font-medium text-gray-500">Attribute</th>
                <th className="pb-2 font-medium text-gray-500">Default</th>
                <th className="pb-2 font-medium text-gray-500">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ["capture-enabled", "true", "Set to \"false\" to disable screenshots entirely. screenshot is null on submit."],
                ["capture-target", "viewport", "DOM region to capture: viewport (document root), main (<main> element), or body (document.body). Falls back to body if target not found."],
                ["capture-scale", "0.35", "html2canvas render scale. Lower = faster and smaller payload, but less resolution."],
                ["capture-timeout-ms", "4500", "Max milliseconds before capture is abandoned. Modal stays fully interactive throughout."],
                ["capture-format", "jpeg", "Output format: jpeg or png. PNG is lossless but significantly larger."],
                ["capture-quality", "0.6", "JPEG compression quality (0\u20131). Ignored when capture-format=\"png\"."],
              ].map(([attr, def, desc]) => (
                <tr key={attr}>
                  <td className="py-2.5 pr-3 align-top">
                    <code className="bg-gray-50 px-1.5 py-0.5 rounded text-xs font-mono text-indigo-600 whitespace-nowrap">{attr}</code>
                  </td>
                  <td className="py-2.5 pr-3 align-top">
                    <code className="text-xs font-mono text-gray-500">{def}</code>
                  </td>
                  <td className="py-2.5 text-gray-600">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Captured Automatically</h3>
          <p className="text-sm text-gray-500 mb-3">
            These are collected without any attributes — no configuration needed.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-2 font-medium text-gray-500">Data</th>
                <th className="pb-2 font-medium text-gray-500">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ["Page URL", "window.location.href"],
                ["URL Parameters", "Query string parsed from the current URL"],
                ["User Agent", "navigator.userAgent (browser & OS info)"],
                ["Screenshot", "Captured asynchronously after modal opens. Null if capture is disabled, timed out, or failed."],
              ].map(([data, source]) => (
                <tr key={data}>
                  <td className="py-2.5 pr-4 text-gray-700 font-medium">{data}</td>
                  <td className="py-2.5 text-gray-500">
                    <code className="bg-gray-50 px-1.5 py-0.5 rounded text-xs font-mono">{source}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Full Example */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Full Example</h2>
          <p className="text-sm text-gray-500 mb-4">A complete example with all optional attributes:</p>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 text-sm overflow-x-auto font-mono leading-relaxed select-all">{`<script src="${backendUrl}/widget.js"><\/script>
<feedback-widget
  site-key="${site.siteKey}"
  api-url="${backendUrl}"
  position="bottom-right"
  page-title="Product Dashboard"
  page-id="dashboard-v2"
  user-id="usr_abc123"
  user-name="Jane Smith"
  metadata='{"plan":"pro","version":"2.4.1"}'
  theme-color="#6366f1"
></feedback-widget>`}</pre>

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-3">Heavy SPA / Dashboard</h3>
          <p className="text-sm text-gray-500 mb-3">
            For apps with large or complex DOM trees, limit the capture region to{" "}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">&lt;main&gt;</code> to avoid
            stalling on full-page capture:
          </p>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 text-sm overflow-x-auto font-mono leading-relaxed select-all">{`<feedback-widget
  site-key="${site.siteKey}"
  api-url="${backendUrl}"
  capture-target="main"
  capture-timeout-ms="6000"
></feedback-widget>`}</pre>

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-3">Disable Screenshots</h3>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 text-sm overflow-x-auto font-mono leading-relaxed select-all">{`<feedback-widget
  site-key="${site.siteKey}"
  api-url="${backendUrl}"
  capture-enabled="false"
></feedback-widget>`}</pre>
        </div>

        {/* Dynamic / SPA Usage */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Dynamic / SPA Usage</h2>
          <p className="text-sm text-gray-500 mb-4">
            For single-page apps or sites where user/page context changes after load, update attributes
            with JavaScript. The widget observes changes and will use whatever is set at the moment the
            user submits.
          </p>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 text-sm overflow-x-auto font-mono leading-relaxed select-all">{`const widget = document.querySelector('feedback-widget');

// After navigation
widget.setAttribute('page-title', 'New Page Title');
widget.setAttribute('page-id', 'page-456');

// After login
widget.setAttribute('user-id', currentUser.id);
widget.setAttribute('user-name', currentUser.name);

// Attach extra context any time
widget.setAttribute('metadata', JSON.stringify({
  plan: currentUser.plan,
  feature_flags: activeFlags,
  session_id: analytics.sessionId
}));`}</pre>
        </div>

        {/* Open from Menu / Link */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Open from a Menu or Link</h2>
          <p className="text-sm text-gray-500 mb-4">
            The widget exposes <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">open()</code> and{" "}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">close()</code> methods
            so you can trigger it from any link, button, or menu item in your site.
          </p>

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-5 mb-3">
            Basic — keep both the icon and a menu link
          </h3>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 text-sm overflow-x-auto font-mono leading-relaxed select-all">{`<!-- The floating icon still appears -->
<feedback-widget site-key="${site?.siteKey}" api-url="${backendUrl}" />

<!-- Your menu link opens the same modal -->
<a href="#" onclick="document.querySelector('feedback-widget').open(); return false;">
  Send Feedback
</a>`}</pre>

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-3">
            Menu only — hide the floating icon
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Add <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">hide-trigger</code> to
            hide the floating button entirely. Only your links/buttons will open the widget.
          </p>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 text-sm overflow-x-auto font-mono leading-relaxed select-all">{`<feedback-widget
  site-key="${site?.siteKey}"
  api-url="${backendUrl}"
  hide-trigger
></feedback-widget>

<!-- Open from a nav menu item -->
<nav>
  <a href="/dashboard">Dashboard</a>
  <a href="/settings">Settings</a>
  <a href="#" onclick="document.querySelector('feedback-widget').open(); return false;">
    Feedback
  </a>
</nav>`}</pre>

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-3">
            JavaScript API
          </h3>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 text-sm overflow-x-auto font-mono leading-relaxed select-all">{`const widget = document.querySelector('feedback-widget');

widget.open();              // Open the feedback modal
widget.close();             // Close the feedback modal
await widget.captureNow();  // Manually trigger capture, returns data URL or null`}</pre>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-4">
            Deleting a site will permanently remove all feedback associated with it.
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? "Deleting..." : "Delete Site"}
          </button>
        </div>
      </div>
    </div>
  );
}
