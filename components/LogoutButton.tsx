"use client";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      className="flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 font-bold text-brand-900 hover:bg-brand-50"
      onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); window.location.href = "/"; }}
    >
      <LogOut size={14} /> Log out
    </button>
  );
}
