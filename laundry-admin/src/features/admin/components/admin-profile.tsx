"use client";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { theme } from "@/lib/theme/theme";
import { useState } from "react";

const cardStyle = {
  borderColor: theme.colors.filledButtonBorder,
  backgroundColor: "rgba(0,0,0,0.04)",
} as const;

function ProfileCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border p-4 sm:p-6" style={cardStyle}>
      <h2 className="text-[16px] font-bold text-white sm:text-[17px]">{title}</h2>
      {subtitle ? <p className="mt-1 text-[12px] leading-relaxed text-white/65 sm:text-[13px]">{subtitle}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function LabelValue({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-white/55">{label}</p>
      <p className={`mt-0.5 text-[13px] text-white sm:text-[14px] ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

export function AdminProfile() {
  const [displayName, setDisplayName] = useState("Admin User");
  const [email, setEmail] = useState("admin@example.com");
  const [phone, setPhone] = useState("+1 (555) 000-1234");
  const [jobTitle, setJobTitle] = useState("Super Admin");
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [passwordModal, setPasswordModal] = useState(false);

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const onSave = () => {
    setSaveHint("Profile updates saved for this demo session.");
    window.setTimeout(() => setSaveHint(null), 2600);
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-white">Profile</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/75 sm:text-[15px]">
          Manage your admin identity, contact details, and security controls.
        </p>
      </div>

      <ProfileCard title="Admin identity" subtitle="Main account owner shown across dashboard actions and audit logs.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full border text-[20px] font-bold text-white"
            style={{ borderColor: theme.colors.outline, backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            {initials || "AA"}
          </div>
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
            <LabelValue label="Admin ID" value="ADM-0001" mono />
            <LabelValue label="Role" value={jobTitle} />
            <LabelValue label="Current workspace" value="Admin Workspace" />
            <LabelValue label="Last sign-in" value="2026-04-08 16:55 UTC" mono />
          </div>
        </div>
      </ProfileCard>

      <ProfileCard title="Contact details" subtitle="Used for alerts, payment notices, and support escalations.">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-medium text-white/60">Display name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border px-3 text-[13px] text-white outline-none focus-visible:ring-2 focus-visible:ring-[#ABE9FE] sm:text-[14px]"
              style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-white/60">Job title</span>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border px-3 text-[13px] text-white outline-none focus-visible:ring-2 focus-visible:ring-[#ABE9FE] sm:text-[14px]"
              style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-white/60">Email address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border px-3 text-[13px] text-white outline-none focus-visible:ring-2 focus-visible:ring-[#ABE9FE] sm:text-[14px]"
              style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-white/60">Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border px-3 text-[13px] text-white outline-none focus-visible:ring-2 focus-visible:ring-[#ABE9FE] sm:text-[14px]"
              style={{ borderColor: theme.colors.outline, backgroundColor: theme.colors.sidebarBackground }}
            />
          </label>
        </div>
      </ProfileCard>

      <ProfileCard title="Security" subtitle="Credential and session controls for this admin account.">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setPasswordModal(true)}
            className="min-h-[44px] rounded-xl border px-4 text-[13px] font-semibold text-white transition hover:bg-white/5 sm:text-[14px]"
            style={{ borderColor: theme.colors.outline }}
          >
            Change password
          </button>
          <button
            type="button"
            className="min-h-[44px] rounded-xl border px-4 text-[13px] font-semibold text-[#F6D36B] transition hover:bg-white/5 sm:text-[14px]"
            style={{ borderColor: "rgba(246, 211, 107, 0.55)" }}
          >
            Enable 2FA
          </button>
        </div>
      </ProfileCard>

      <div className="flex min-h-[2.75rem] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {saveHint ? (
          <p className="text-[12px] text-[#ABE9FE] sm:text-[13px]" role="status">
            {saveHint}
          </p>
        ) : (
          <span className="hidden sm:block" />
        )}
        <button
          type="button"
          onClick={onSave}
          className="h-11 w-full rounded-full border px-6 text-[15px] font-semibold text-white shadow-sm transition hover:brightness-105 sm:ml-auto sm:w-auto sm:min-w-[200px]"
          style={{ borderColor: theme.colors.filledButtonBorder, backgroundColor: theme.colors.secondary }}
        >
          Save profile
        </button>
      </div>

      <ConfirmModal
        open={passwordModal}
        title="Change password?"
        description="In production, this will redirect to secure password update flow."
        confirmLabel="Continue"
        cancelLabel="Cancel"
        onConfirm={() => setPasswordModal(false)}
        onCancel={() => setPasswordModal(false)}
      />
    </div>
  );
}
