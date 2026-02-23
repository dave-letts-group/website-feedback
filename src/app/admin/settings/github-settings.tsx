"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GithubSettingsProps {
  hasToken: boolean;
  githubRepo: string | null;
}

export default function GithubSettings({
  hasToken,
  githubRepo,
}: GithubSettingsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [token, setToken] = useState("");
  const [repo, setRepo] = useState(githubRepo || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSave() {
    setError("");
    setSuccess("");

    if (token && !repo) {
      setError("Repository is required when setting a token");
      return;
    }
    if (repo && !token && !hasToken) {
      setError("Token is required when setting a repository");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, string> = { githubRepo: repo };
      if (token) body.githubToken = token;

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

      setSuccess("GitHub settings saved and verified");
      setEditing(false);
      setToken("");
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
        body: JSON.stringify({ githubToken: "", githubRepo: "" }),
      });
      setSuccess("GitHub disconnected");
      setEditing(false);
      setToken("");
      setRepo("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  const isConnected = hasToken && githubRepo;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">
            GitHub Integration
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
        Create GitHub issues automatically for each feedback submission.
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
              <dt className="text-gray-400 font-medium">Token</dt>
              <dd className="text-gray-700 font-mono text-xs">
                {hasToken ? "••••••••••••••••" : "Not set"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-400 font-medium">Repository</dt>
              <dd className="text-gray-700 font-mono text-xs truncate max-w-[200px]">
                {githubRepo || "Not set"}
              </dd>
            </div>
          </dl>
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {isConnected ? "Update credentials" : "Configure GitHub"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Personal Access Token {hasToken && "(leave blank to keep current)"}
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repository
            </label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="owner/repo"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900 font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              Format: owner/repository-name (e.g. acme/my-app)
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
              How it works
            </p>
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
  );
}
