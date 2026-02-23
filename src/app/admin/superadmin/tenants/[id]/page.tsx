"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface SiteInfo {
  id: string;
  name: string;
  domain: string | null;
  siteKey: string;
  createdAt: string;
  feedbackCount: number;
}

interface AdminInfo {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isSuperAdmin: boolean;
  createdAt: string;
}

interface TenantDetail {
  id: string;
  name: string;
  createdAt: string;
  feedbackCount: number;
  sites: SiteInfo[];
  admins: AdminInfo[];
}

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-indigo-100 text-indigo-700",
  admin: "bg-amber-100 text-amber-700",
  member: "bg-gray-100 text-gray-600",
};

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/superadmin/tenants/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.tenant) setTenant(data.tenant);
        else setError(data.error || "Failed to load");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleImpersonate() {
    const res = await fetch("/api/superadmin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: id }),
    });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete tenant "${tenant?.name}" and ALL its data? This cannot be undone.`)) return;
    const res = await fetch(`/api/superadmin/tenants/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/superadmin/tenants");
    } else {
      const data = await res.json();
      setError(data.error || "Delete failed");
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
          {error || "Tenant not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <Link
          href="/admin/superadmin/tenants"
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          &larr; All Tenants
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="text-gray-500 mt-1">
            Created {new Date(tenant.createdAt).toLocaleDateString()} &middot;{" "}
            {tenant.feedbackCount} feedback entries
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleImpersonate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Switch to Tenant
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-200 transition-colors"
          >
            Delete Tenant
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100 mb-4">
          {error}
        </div>
      )}

      {/* Sites */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Sites ({tenant.sites.length})</h2>
        </div>
        {tenant.sites.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No sites</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Domain</th>
                <th className="px-6 py-3 font-medium">Site Key</th>
                <th className="px-6 py-3 font-medium">Feedback</th>
                <th className="px-6 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tenant.sites.map((site) => (
                <tr key={site.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{site.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{site.domain || "—"}</td>
                  <td className="px-6 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                      {site.siteKey.slice(0, 12)}...
                    </code>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{site.feedbackCount}</td>
                  <td className="px-6 py-3 text-sm text-gray-400 whitespace-nowrap">
                    {new Date(site.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Members ({tenant.admins.length})</h2>
        </div>
        {tenant.admins.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No members</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tenant.admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">
                    {admin.name || "Unnamed"}
                    {admin.isSuperAdmin && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                        SUPER
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{admin.email}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[admin.role] || ROLE_BADGE.member}`}>
                      {admin.role}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-400 whitespace-nowrap">
                    {new Date(admin.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
