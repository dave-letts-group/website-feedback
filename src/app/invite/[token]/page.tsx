"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface InviteDetails {
  email: string;
  role: string;
  tenantName: string;
  expiresAt: string;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "an Owner",
  admin: "an Admin",
  member: "a Member",
};

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/team/invites/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setFetchError(data.error || "This invite is invalid or has expired.");
          return;
        }
        setInvite(data);
      } catch {
        setFetchError("Failed to load invite details.");
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/team/invites/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Failed to accept invite");
        return;
      }

      router.push("/admin");
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Join the Team</h1>
          <p className="text-slate-400 mt-1">Accept your invite to get started</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
            <p className="mt-3 text-gray-500 text-sm">Loading invite details...</p>
          </div>
        ) : fetchError ? (
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Invalid Invite</h2>
            <p className="text-gray-500 text-sm mb-6">{fetchError}</p>
            <a
              href="/admin/login"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Go to Sign In
            </a>
          </div>
        ) : invite ? (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <p className="text-gray-700">
                You&apos;ve been invited to join{" "}
                <span className="font-semibold text-gray-900">{invite.tenantName}</span>{" "}
                as {ROLE_LABEL[invite.role] || invite.role}
              </p>
              <p className="text-sm text-gray-400 mt-1">{invite.email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {submitError && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Creating account..." : "Accept Invite & Join"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Already have an account?{" "}
              <a href="/admin/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Sign in
              </a>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
