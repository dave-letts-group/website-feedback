"use client";

import { useEffect, useState, useCallback } from "react";

interface ApiKey {
  id: string;
  name: string;
  permissions: string[];
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

interface Site {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [tenantName, setTenantName] = useState("");
  const [tenantNameInput, setTenantNameInput] = useState("");
  const [tenantSaving, setTenantSaving] = useState(false);
  const [tenantSuccess, setTenantSuccess] = useState("");
  const [tenantError, setTenantError] = useState("");
  const [canManageTenant, setCanManageTenant] = useState(false);

  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [newKeyCopied, setNewKeyCopied] = useState(false);
  const [keyCreating, setKeyCreating] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [keySuccess, setKeySuccess] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/me").then((r) => r.json()),
      fetch("/api/tenants/me").then((r) => r.json()),
    ]).then(([adminData, tenantData]) => {
      if (adminData.admin) {
        setName(adminData.admin.name || "");
        setEmail(adminData.admin.email || "");
      }
      if (tenantData.name) {
        setTenantName(tenantData.name);
        setTenantNameInput(tenantData.name);
        setSites(tenantData.sites || []);
        if (tenantData.sites?.length > 0) setSelectedSiteId(tenantData.sites[0].id);
        setCanManageTenant(["owner", "admin"].includes(tenantData.role));
      }
    }).finally(() => setLoading(false));
  }, []);

  const fetchApiKeys = useCallback(async (siteId: string) => {
    if (!siteId) return;
    setApiKeysLoading(true);
    setApiKeys([]);
    try {
      const res = await fetch(`/api/sites/${siteId}/api-keys`);
      const data = await res.json();
      if (res.ok) setApiKeys(data.apiKeys || []);
    } finally {
      setApiKeysLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSiteId) fetchApiKeys(selectedSiteId);
  }, [selectedSiteId, fetchApiKeys]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setProfileSaving(true);
    try {
      const res = await fetch("/api/admin/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || "Failed to save");
      } else {
        setProfileSuccess("Profile updated");
      }
    } catch {
      setProfileError("Network error");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/admin/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Failed to update password");
      } else {
        setPasswordSuccess("Password updated");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordError("Network error");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleTenantSave(e: React.FormEvent) {
    e.preventDefault();
    setTenantError("");
    setTenantSuccess("");
    setTenantSaving(true);
    try {
      const res = await fetch("/api/tenants/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tenantNameInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTenantError(data.error || "Failed to save");
      } else {
        setTenantName(data.tenant.name);
        setTenantSuccess("Organisation name updated");
      }
    } catch {
      setTenantError("Network error");
    } finally {
      setTenantSaving(false);
    }
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    setKeyError("");
    setKeySuccess("");
    setNewKeyRaw(null);
    setKeyCreating(true);
    try {
      const res = await fetch(`/api/sites/${selectedSiteId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setKeyError(data.error || "Failed to create key");
      } else {
        setNewKeyRaw(data.apiKey.key);
        setNewKeyName("");
        fetchApiKeys(selectedSiteId);
      }
    } catch {
      setKeyError("Network error");
    } finally {
      setKeyCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    if (!confirm("Revoke this API key? Any integrations using it will stop working.")) return;
    setRevoking(keyId);
    try {
      const res = await fetch(`/api/sites/${selectedSiteId}/api-keys/${keyId}`, { method: "DELETE" });
      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
      }
    } finally {
      setRevoking(null);
    }
  }

  function copyNewKey() {
    if (!newKeyRaw) return;
    navigator.clipboard.writeText(newKeyRaw);
    setNewKeyCopied(true);
    setTimeout(() => setNewKeyCopied(false), 2000);
  }

  function formatDate(iso: string | null) {
    if (!iso) return "Never";
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  if (loading) {
    return (
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
          <p className="mt-3">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="space-y-6">
        {/* Organisation */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Organisation</h2>
          {canManageTenant ? (
            <form onSubmit={handleTenantSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input
                  type="text"
                  value={tenantNameInput}
                  onChange={(e) => setTenantNameInput(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                />
              </div>
              {tenantError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{tenantError}</p>
              )}
              {tenantSuccess && (
                <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">{tenantSuccess}</p>
              )}
              <button
                type="submit"
                disabled={tenantSaving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {tenantSaving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-gray-700">{tenantName}</p>
          )}
        </div>

        {/* API Keys */}
        {sites.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">API Keys</h2>
            <p className="text-sm text-gray-500 mb-4">Keys authenticate external integrations to submit feedback.</p>

            {/* Site selector */}
            {sites.length > 1 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Site</label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* New key reveal */}
            {newKeyRaw && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2">
                  Copy this key now — it won&apos;t be shown again
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-amber-200 rounded px-3 py-2 text-xs font-mono text-gray-800 break-all select-all">
                    {newKeyRaw}
                  </code>
                  <button
                    onClick={copyNewKey}
                    className="shrink-0 px-3 py-2 text-xs border border-amber-300 bg-white rounded-lg text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    {newKeyCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <button
                  onClick={() => setNewKeyRaw(null)}
                  className="mt-2 text-xs text-amber-600 hover:text-amber-800"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Existing keys */}
            {apiKeysLoading ? (
              <div className="py-6 text-center text-gray-400 text-sm">Loading keys...</div>
            ) : apiKeys.length === 0 ? (
              <p className="text-sm text-gray-400 mb-4">No API keys yet.</p>
            ) : (
              <div className="mb-4 divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                {apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between px-4 py-3 bg-white">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{key.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Created {formatDate(key.createdAt)} · Last used {formatDate(key.lastUsedAt)}
                        {key.expiresAt && ` · Expires ${formatDate(key.expiresAt)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevoke(key.id)}
                      disabled={revoking === key.id}
                      className="ml-4 shrink-0 text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                    >
                      {revoking === key.id ? "Revoking..." : "Revoke"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Create new key */}
            {canManageTenant && (
              <form onSubmit={handleCreateKey} className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g. Production)"
                  required
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
                />
                <button
                  type="submit"
                  disabled={keyCreating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {keyCreating ? "Creating..." : "Create Key"}
                </button>
              </form>
            )}
            {keyError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100 mt-2">{keyError}</p>
            )}
            {keySuccess && (
              <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 mt-2">{keySuccess}</p>
            )}
          </div>
        )}

        {/* Profile */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
            </div>
            {profileError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{profileError}</p>
            )}
            {profileSuccess && (
              <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">{profileSuccess}</p>
            )}
            <button
              type="submit"
              disabled={profileSaving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {profileSaving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">Minimum 8 characters.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
              />
            </div>
            {passwordError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">{passwordSuccess}</p>
            )}
            <button
              type="submit"
              disabled={passwordSaving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {passwordSaving ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
