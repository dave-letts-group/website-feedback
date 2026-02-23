"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Site {
  id: string;
  name: string;
  domain: string | null;
  siteKey: string;
  createdAt: string;
  feedbackCount: number;
}

export default function SitesPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [creating, setCreating] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch("/api/sites");
      const data = await res.json();
      if (res.ok) {
        setSites(data.sites);
      } else {
        setError(data.error || "Failed to load sites");
      }
    } catch {
      setError("Failed to load sites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCreating(true);

    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, domain: newDomain || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create site");
        return;
      }

      setSuccess(`Site "${data.site.name}" created`);
      setNewName("");
      setNewDomain("");
      setShowCreateForm(false);
      fetchSites();
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  }

  function copySiteKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
          <p className="text-gray-500 mt-1">Manage your sites and widget configurations</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
          <p className="mt-3">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
          <p className="text-gray-500 mt-1">Manage your sites and widget configurations</p>
        </div>
        <button
          onClick={() => { setShowCreateForm(!showCreateForm); setError(""); setSuccess(""); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Create Site
        </button>
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

      {showCreateForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create a New Site</h2>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="My Website"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Domain (optional)</label>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="example.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2.5 text-gray-600 text-sm font-medium hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {sites.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
          </svg>
          <p>No sites yet. Create your first site to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <div key={site.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{site.name}</h3>
                  {site.domain && (
                    <p className="text-sm text-gray-500 mt-0.5">{site.domain}</p>
                  )}
                </div>
                <button
                  onClick={() => router.push(`/admin/sites/${site.id}`)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium shrink-0"
                >
                  Edit
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-400 font-medium mb-1">Site Key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-xs text-gray-700 truncate select-all">
                    {site.siteKey}
                  </code>
                  <button
                    onClick={() => copySiteKey(site.siteKey)}
                    className="shrink-0 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Copy site key"
                  >
                    {copiedKey === site.siteKey ? (
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50 text-sm">
                <span className="text-gray-500">
                  {site.feedbackCount} {site.feedbackCount === 1 ? "feedback" : "feedbacks"}
                </span>
                <span className="text-gray-400">
                  Created {new Date(site.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
