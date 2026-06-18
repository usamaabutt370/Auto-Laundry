"use client";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { PRODUCT_NAME } from "@/lib/branding";
import { theme } from "@/lib/theme/theme";
import { useCallback, useState, type ReactNode } from "react";

const cardStyle = {
  borderColor: theme.colors.filledButtonBorder,
  backgroundColor: "rgba(0,0,0,0.04)",
} as const;

type ToggleProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
};

function SettingToggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div
      className="flex items-start justify-between gap-4 border-b py-3.5 last:border-b-0 sm:py-4"
      style={{ borderColor: "rgba(255,255,255,0.1)" }}
    >
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-white sm:text-[15px]">{label}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-white/60 sm:text-[13px]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-7 w-[44px] shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#ABE9FE] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        style={{ backgroundColor: checked ? theme.colors.secondary : "rgba(255,255,255,0.14)" }}
      >
        <span
          className={`absolute left-0.5 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

type SettingsCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

function SettingsCard({ title, subtitle, children }: SettingsCardProps) {
  return (
    <section
      className="rounded-2xl border p-4 sm:p-6"
      style={cardStyle}
    >
      <h2
        className="text-[16px] font-bold sm:text-[17px]"
        style={{ color: theme.colors.themeWhite }}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-1 text-[12px] leading-relaxed text-white/65 sm:text-[13px]">{subtitle}</p>
      ) : null}
      <div className="mt-1">{children}</div>
    </section>
  );
}

export function AdminSettings() {
  const [emailDigest, setEmailDigest] = useState(true);
  const [orderAlerts, setOrderAlerts] = useState(true);
  const [kycAlerts, setKycAlerts] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(false);

  const [timezone, setTimezone] = useState("America/New_York");
  const [dateFormat, setDateFormat] = useState("mdy");
  const [weekStart, setWeekStart] = useState("sunday");

  const [sessionTimeout, setSessionTimeout] = useState("8h");
  const [signOutOthersOpen, setSignOutOthersOpen] = useState(false);

  const [saveHint, setSaveHint] = useState<string | null>(null);

  const handleSave = useCallback(() => {
    setSaveHint("Preferences saved for this demo session.");
    window.setTimeout(() => setSaveHint(null), 3200);
  }, []);

  const selectClass =
    "admin-filter-select w-full min-h-[44px] cursor-pointer rounded-xl border py-2.5 pl-3 text-[13px] font-medium text-white outline-none sm:max-w-md";

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold text-white">Settings</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/75 sm:text-[15px]">
          Control how {PRODUCT_NAME} admin notifies you, how dates appear, and session behavior. Preferences here are
          local to this browser until your backend is connected.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-5">
        <SettingsCard
          title="Notifications"
          subtitle="Choose what appears in email and in-app alerts for your Super Admin account."
        >
          <SettingToggle
            label="Daily email digest"
            description="Summary of orders, payouts, and disputes from the last 24 hours."
            checked={emailDigest}
            onChange={setEmailDigest}
          />
          <SettingToggle
            label="New order alerts"
            description="Real-time notices when high-priority orders are placed or stalled."
            checked={orderAlerts}
            onChange={setOrderAlerts}
          />
          <SettingToggle
            label="Partner KYC updates"
            description="When a partner submits documents or changes verification status."
            checked={kycAlerts}
            onChange={setKycAlerts}
          />
          <SettingToggle
            label="Payment anomalies"
            description="Failed captures, chargebacks, and unusual refund volume."
            checked={paymentAlerts}
            onChange={setPaymentAlerts}
          />
        </SettingsCard>

        <SettingsCard
          title="Regional & display"
          subtitle="How timestamps and calendars are shown in the admin console."
        >
          <div className="space-y-4 pt-2">
            <div>
              <label htmlFor="settings-timezone" className="block text-[12px] font-medium text-white/70 sm:text-[13px]">
                Timezone
              </label>
              <select
                id="settings-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={`${selectClass} mt-1.5`}
                style={{
                  borderColor: theme.colors.outline,
                  backgroundColor: theme.colors.sidebarBackground,
                }}
              >
                <option value="America/New_York">Eastern (US & Canada)</option>
                <option value="America/Chicago">Central (US & Canada)</option>
                <option value="America/Denver">Mountain (US & Canada)</option>
                <option value="America/Los_Angeles">Pacific (US & Canada)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div>
              <label htmlFor="settings-date-format" className="block text-[12px] font-medium text-white/70 sm:text-[13px]">
                Date format
              </label>
              <select
                id="settings-date-format"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className={`${selectClass} mt-1.5`}
                style={{
                  borderColor: theme.colors.outline,
                  backgroundColor: theme.colors.sidebarBackground,
                }}
              >
                <option value="mdy">MM/DD/YYYY</option>
                <option value="dmy">DD/MM/YYYY</option>
                <option value="ymd">YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <label htmlFor="settings-week-start" className="block text-[12px] font-medium text-white/70 sm:text-[13px]">
                Week starts on
              </label>
              <select
                id="settings-week-start"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className={`${selectClass} mt-1.5`}
                style={{
                  borderColor: theme.colors.outline,
                  backgroundColor: theme.colors.sidebarBackground,
                }}
              >
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
              </select>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Security"
          subtitle="Session rules for this admin workspace. Hook these controls to your auth provider when ready."
        >
          <div className="space-y-4 pt-2">
            <div>
              <label htmlFor="settings-session" className="block text-[12px] font-medium text-white/70 sm:text-[13px]">
                Idle sign-out
              </label>
              <select
                id="settings-session"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className={`${selectClass} mt-1.5`}
                style={{
                  borderColor: theme.colors.outline,
                  backgroundColor: theme.colors.sidebarBackground,
                }}
              >
                <option value="1h">After 1 hour</option>
                <option value="4h">After 4 hours</option>
                <option value="8h">After 8 hours</option>
                <option value="never">Never (not recommended)</option>
              </select>
            </div>
            <div
              className="rounded-xl border px-3 py-3 sm:px-4 sm:py-4"
              style={{
                borderColor: "rgba(241, 140, 140, 0.35)",
                backgroundColor: "rgba(0,0,0,0.06)",
              }}
            >
              <p className="text-[13px] font-semibold text-white sm:text-[14px]">Other sessions</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/65 sm:text-[13px]">
                Sign out every other browser or device that is using this admin account. You will stay signed in here.
              </p>
              <button
                type="button"
                onClick={() => setSignOutOthersOpen(true)}
                className="mt-3 h-10 rounded-full border px-4 text-[13px] font-semibold text-white transition hover:bg-white/5 sm:h-11 sm:px-5 sm:text-[14px]"
                style={{ borderColor: "rgba(241, 140, 140, 0.55)" }}
              >
                Sign out other sessions
              </button>
            </div>
          </div>
        </SettingsCard>
      </div>

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
          onClick={handleSave}
          className="h-11 w-full rounded-full border px-6 text-[15px] font-semibold text-white shadow-sm transition hover:brightness-105 sm:ml-auto sm:w-auto sm:min-w-[200px]"
          style={{
            borderColor: theme.colors.filledButtonBorder,
            backgroundColor: theme.colors.secondary,
          }}
        >
          Save preferences
        </button>
      </div>

      <ConfirmModal
        open={signOutOthersOpen}
        title="Sign out other sessions?"
        description="Other browsers and devices will need to sign in again. This action cannot be undone from here."
        confirmLabel="Sign others out"
        cancelLabel="Cancel"
        onConfirm={() => setSignOutOthersOpen(false)}
        onCancel={() => setSignOutOthersOpen(false)}
      />
    </div>
  );
}
