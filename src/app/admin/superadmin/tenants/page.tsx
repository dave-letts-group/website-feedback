"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Tenant {
  id: string;
  name: string;
  createdAt: string;
  siteCount: number;
  memberCount: number;
  feedbackCount: number;
}

export default function TenantsListPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/superadmin/tenants")
      .then((r) => r.json())
      .then((data) => {
        if (data.tenants) setTenants(data.tenants);
        else setError(data.error || "Failed to load tenants");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleImpersonate(tenantId: string) {
    const res = await fetch("/api/superadmin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">All Tenants</h1>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Tenants</h1>
          <p className="text-gray-500 mt-1">{tenants.length} tenant{tenants.length !== 1 ? "s" : ""} registered</p>
        </div>
        <Link
          href="/admin/superadmin"
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          &larr; Back to overview
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100 mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {tenants.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No tenants found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-3 font-medium">Tenant</th>
                <th className="px-6 py-3 font-medium">Sites</th>
                <th className="px-6 py-3 font-medium">Members</th>
                <th className="px-6 py-3 font-medium">Feedback</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/superadmin/tenants/${tenant.id}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {tenant.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{tenant.siteCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{tenant.memberCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{tenant.feedbackCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleImpersonate(tenant.id)}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Switch to &rarr;
                    </button>
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
