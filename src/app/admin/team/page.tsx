"use client";

import { useEffect, useState, useCallback } from "react";

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: { name: string | null; email: string };
}

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-indigo-100 text-indigo-700",
  admin: "bg-amber-100 text-amber-700",
  member: "bg-gray-100 text-gray-600",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[role] || ROLE_BADGE.member}`}>
      {role}
    </span>
  );
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch("/api/team"),
        fetch("/api/team/invites"),
      ]);

      const membersData = await membersRes.json();
      if (membersRes.ok) {
        setMembers(membersData.members);
        setCurrentUser(membersData.currentUser);
      }

      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvites(invitesData.invites);
      }
    } catch {
      setError("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    setInviting(true);
    setInviteLink("");

    try {
      const res = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send invite");
        return;
      }

      setInviteLink(data.inviteUrl);
      setSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("member");
      fetchTeam();
    } catch {
      setError("Network error");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    clearMessages();
    setChangingRole(memberId);

    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update role");
        return;
      }

      setSuccess("Role updated");
      fetchTeam();
    } catch {
      setError("Network error");
    } finally {
      setChangingRole(null);
    }
  }

  async function handleRemove(memberId: string, memberName: string) {
    if (!confirm(`Remove ${memberName} from the team?`)) return;
    clearMessages();
    setRemoving(memberId);

    try {
      const res = await fetch(`/api/team/${memberId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to remove member");
        return;
      }

      setSuccess("Member removed");
      fetchTeam();
    } catch {
      setError("Network error");
    } finally {
      setRemoving(null);
    }
  }

  const isOwner = currentUser?.role === "owner";
  const isAdminOrOwner = currentUser?.role === "owner" || currentUser?.role === "admin";

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500 mt-1">Manage your team members and invites</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
          <p className="mt-3">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500 mt-1">Manage your team members and invites</p>
        </div>
        {isAdminOrOwner && (
          <button
            onClick={() => { setShowInviteForm(!showInviteForm); setInviteLink(""); clearMessages(); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Invite Member
          </button>
        )}
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

      {showInviteForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite a Team Member</h2>
          <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="colleague@example.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-gray-900"
              />
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="member">Member</option>
                {isOwner && <option value="admin">Admin</option>}
                {isOwner && <option value="owner">Owner</option>}
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {inviting ? "Sending..." : "Send Invite"}
            </button>
          </form>

          {inviteLink && (
            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
              <p className="text-sm font-medium text-indigo-800 mb-2">Invite link (valid for 7 days):</p>
              <code className="block bg-white border border-indigo-200 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-800 select-all break-all">
                {inviteLink}
              </code>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Members ({members.length})
          </h2>
        </div>

        {members.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No team members found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Joined</th>
                {isAdminOrOwner && <th className="px-6 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map((member) => {
                const isSelf = member.id === currentUser?.id;
                return (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {member.name || "Unnamed"}
                      </span>
                      {isSelf && (
                        <span className="ml-2 text-xs text-gray-400">(you)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{member.email}</td>
                    <td className="px-6 py-4">
                      {isOwner && !isSelf ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          disabled={changingRole === member.id}
                          className="px-2 py-1 border border-gray-200 rounded-lg text-xs text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                        >
                          <option value="owner">owner</option>
                          <option value="admin">admin</option>
                          <option value="member">member</option>
                        </select>
                      ) : (
                        <RoleBadge role={member.role} />
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    {isAdminOrOwner && (
                      <td className="px-6 py-4">
                        {!isSelf && (isOwner || (currentUser?.role === "admin" && member.role === "member")) && (
                          <button
                            onClick={() => handleRemove(member.id, member.name || member.email)}
                            disabled={removing === member.id}
                            className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                          >
                            {removing === member.id ? "Removing..." : "Remove"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {invites.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Pending Invites ({invites.length})
            </h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Expires</th>
                <th className="px-6 py-3 font-medium">Invited By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invites.map((invite) => (
                <tr key={invite.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3 text-sm text-gray-700">{invite.email}</td>
                  <td className="px-6 py-3"><RoleBadge role={invite.role} /></td>
                  <td className="px-6 py-3 text-sm text-gray-400 whitespace-nowrap">
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    {invite.invitedBy?.name || invite.invitedBy?.email || "Unknown"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
