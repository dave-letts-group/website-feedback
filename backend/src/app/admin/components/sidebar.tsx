"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

interface SidebarProps {
  adminName: string;
  tenantName: string;
  role: string;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
  homeTenantName?: string;
  sites: Array<{ id: string; name: string }>;
  currentSiteId: string | null;
}

export default function Sidebar({
  adminName,
  tenantName,
  role,
  isSuperAdmin,
  isImpersonating,
  homeTenantName,
  sites,
  currentSiteId,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentSite = sites.find((s) => s.id === currentSiteId) ?? sites[0] ?? null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSiteDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectSite(siteId: string) {
    document.cookie = `current-site-id=${siteId};path=/;max-age=${60 * 60 * 24 * 365}`;
    setSiteDropdownOpen(false);
    router.refresh();
  }

  async function handleReturnHome() {
    const res = await fetch("/api/superadmin/return", { method: "POST" });
    if (res.ok) {
      router.push("/admin/superadmin");
      router.refresh();
    }
  }

  const links = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      exact: true,
    },
    {
      href: "/admin/feedback",
      label: "Feedback",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
    {
      href: "/admin/sites",
      label: "Sites",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    ...(role === "owner" || role === "admin" || isSuperAdmin
      ? [
          {
            href: "/admin/team",
            label: "Team",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ),
          },
        ]
      : []),
    {
      href: "/admin/settings",
      label: "Settings",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="font-bold text-lg">LettsFeedback</span>
        </div>
      </div>

      {/* Impersonation banner */}
      {isImpersonating && (
        <div className="mx-4 mt-3 px-3 py-2 bg-amber-500/15 border border-amber-500/30 rounded-lg">
          <p className="text-[11px] text-amber-300 uppercase tracking-wider font-medium mb-1">
            Viewing as
          </p>
          <p className="text-sm font-medium text-amber-100 truncate">{tenantName}</p>
          <button
            onClick={handleReturnHome}
            className="mt-1.5 text-xs text-amber-300 hover:text-amber-100 font-medium transition-colors"
          >
            &larr; Return to {homeTenantName || "home"}
          </button>
        </div>
      )}

      {/* Site Selector */}
      <div className="px-4 pt-4" ref={dropdownRef}>
        <div className="relative">
          <button
            onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-800 rounded-lg text-sm text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <span className="truncate">{currentSite?.name ?? "No sites"}</span>
            <svg
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${siteDropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {siteDropdownOpen && (
            <div className="absolute z-50 mt-1 w-full bg-slate-800 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
              <div className="max-h-48 overflow-y-auto py-1">
                {sites.map((site) => (
                  <button
                    key={site.id}
                    onClick={() => selectSite(site.id)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      site.id === currentSite?.id
                        ? "bg-indigo-600/20 text-indigo-300"
                        : "text-slate-300 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    {site.name}
                  </button>
                ))}
              </div>
              <Link
                href="/admin/sites"
                onClick={() => setSiteDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-400 hover:bg-slate-700 border-t border-slate-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Site
              </Link>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(link.href, link.exact)
                ? "bg-indigo-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}

        {/* Super Admin section */}
        {isSuperAdmin && (
          <>
            <div className="pt-4 pb-1 px-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Super Admin
              </p>
            </div>
            <Link
              href="/admin/superadmin"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/admin/superadmin"
                  ? "bg-purple-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Overview
            </Link>
            <Link
              href="/admin/superadmin/tenants"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith("/admin/superadmin/tenants")
                  ? "bg-purple-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              All Tenants
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-700/50">
        {!isImpersonating && (
          <div className="px-4 mb-3">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Tenant</p>
            <p className="text-sm font-medium text-slate-200 truncate">{tenantName}</p>
          </div>
        )}
        <div className="px-4 mb-3">
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Signed in as</p>
            <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
              {role}
            </span>
            {isSuperAdmin && (
              <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300">
                super
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-200 truncate">{adminName}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
