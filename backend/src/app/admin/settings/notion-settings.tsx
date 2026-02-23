"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface NotionSettingsProps {
  hasApiKey: boolean;
  notionDbId: string | null;
}

export default function NotionSettings({
  hasApiKey,
  notionDbId,
}: NotionSettingsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [dbId, setDbId] = useState(notionDbId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSave() {
    setError("");
    setSuccess("");

    if (apiKey && !dbId) {
      setError("Database ID is required when setting an API key");
      return;
    }
    if (dbId && !apiKey && !hasApiKey) {
      setError("API key is required when setting a database ID");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, string> = { notionDbId: dbId };
      if (apiKey) body.notionApiKey = apiKey;

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }

      setSuccess("Notion settings saved and verified");
      setEditing(false);
      setApiKey("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notionApiKey: "", notionDbId: "" }),
      });
      setSuccess("Notion disconnected");
      setEditing(false);
      setApiKey("");
      setDbId("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  const isConnected = hasApiKey && notionDbId;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.03 2.205c-.467-.373-.84-.187-1.96-.093L3.2 2.952c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.84c-.56.047-.747.327-.747.98zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.747 0-.933-.234-1.494-.934l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.222.187c-.093-.186 0-.653.327-.746l.84-.233V8.756l-1.168-.093c-.093-.42.14-1.026.793-1.073l3.456-.234 4.764 7.28V8.57l-1.215-.14c-.093-.514.28-.886.747-.933zM2.723 1.355l13.308-.84c1.635-.14 2.055-.047 3.082.7l4.25 2.986c.7.513.933.653.933 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.046-1.448-.094-1.962-.747L1.15 18.473c-.56-.747-.793-1.306-.793-1.96V2.895c0-.84.373-1.494 1.307-1.587z"/>
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">
            Notion Integration
          </h2>
        </div>
        {isConnected && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Connected
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Sync feedback to a Notion database automatically. Each submission creates
        a new page.
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg border border-red-100 mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-2.5 rounded-lg border border-emerald-100 mb-4">
          {success}
        </div>
      )}

      {!editing ? (
        <div className="space-y-3">
          <dl className="text-sm space-y-2">
            <div className="flex items-center justify-between">
              <dt className="text-gray-400 font-medium">API Key</dt>
              <dd className="text-gray-700 font-mono text-xs">
                {hasApiKey ? "••••••••••••••••" : "Not set"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-400 font-medium">Database ID</dt>
              <dd className="text-gray-700 font-mono text-xs truncate max-w-[200px]">
                {notionDbId || "Not set"}
              </dd>
            </div>
          </dl>
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {isConnected ? "Update credentials" : "Configure Notion"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notion API Key {hasApiKey && "(leave blank to keep current)"}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="ntn_..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Database ID
            </label>
            <input
              type="text"
              value={dbId}
              onChange={(e) => setDbId(e.target.value)}
              placeholder="abc123def456..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900 font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              The 32-character ID from your database URL
            </p>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Verifying..." : "Save & Verify"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setError("");
                setSuccess("");
              }}
              className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-800"
            >
              Cancel
            </button>
            {isConnected && (
              <button
                onClick={handleDisconnect}
                disabled={saving}
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
  );
}
