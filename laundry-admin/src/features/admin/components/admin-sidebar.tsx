"use client";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { PRODUCT_NAME } from "@/lib/branding";
import { theme } from "@/lib/theme/theme";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", iconSrc: "/icons/file-checked.svg", iconSize: 16 },
  { href: "/orders", label: "Orders", iconSrc: "/icons/file-checked.svg", iconSize: 16 },
  { href: "/users", label: "Users", iconSrc: "/icons/file-checked.svg", iconSize: 16 },
  { href: "/partner-kyc", label: "Partner KYC", iconSrc: "/icons/file-checked.svg", iconSize: 16 },
  { href: "/credits", label: "Credits", iconSrc: "/icons/file-checked.svg", iconSize: 16 },
  { href: "/disputes", label: "Disputes", iconSrc: "/icons/file-checked.svg", iconSize: 16 },
  { href: "/profile", label: "Profile", iconSrc: "/icons/file-checked.svg", iconSize: 16 },
  { href: "/settings", label: "Settings", iconSrc: "/icons/file-checked.svg", iconSize: 16 },
  { href: "/login", label: "Logout", iconSrc: "/icons/file-checked.svg", iconSize: 16 },
];

function navItemIsActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href !== "/" && pathname.startsWith(`${href}/`)) return true;
  return false;
}

function SidebarImageIcon({ src, size }: { src: string; size: number }) {
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className="object-contain"
    />
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <aside
      className="w-full shrink-0 border-b px-3 py-4 sm:px-4 lg:max-w-[248px] lg:border-b-0 lg:border-r"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: theme.colors.sidebarBackground,
      }}
    >
      <div className="mb-3 flex items-center justify-between px-1 pt-1 lg:mb-4 lg:pt-2">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 overflow-hidden rounded-full border border-white/20 bg-[#5a6d79]">
            <div className="flex h-full w-full items-center justify-center text-[11px] text-white/80">
              KB
            </div>
          </div>
          <div className="lg:block">
            <p
              className="text-[15px] leading-5 sm:text-[16px] lg:text-[18px]"
              style={{ color: theme.colors.themeWhite, fontWeight: theme.fontWeights.medium }}
            >
              {PRODUCT_NAME}
            </p>
            <p className="hidden text-[11px] leading-4 text-white/70 sm:block">Admin console</p>
          </div>
        </div>
        <Link
          href="/settings"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/6 transition hover:bg-white/10"
          aria-label="Settings"
        >
          <SidebarImageIcon src="/icons/setting.svg" size={16} />
        </Link>
      </div>

      <p className="mb-2 mt-2 px-2 text-[12px] font-bold text-white/90 sm:text-[13px] lg:mt-3 lg:text-[14px]">
        Menu
      </p>

      <nav className="scrollbar-hidden grid max-h-[min(52vh,420px)] grid-cols-3 gap-2 overflow-y-auto overflow-x-hidden border-t border-white/8 pt-2 [-webkit-overflow-scrolling:touch] sm:grid-cols-4 md:grid-cols-5 lg:max-h-[calc(100dvh-220px)] lg:grid-cols-1 lg:gap-1.5">
        {menuItems.map((item) => {
          const isActive = navItemIsActive(pathname, item.href);
          const content = (
            <>
              <span className="relative flex h-8 w-8 items-center justify-center lg:h-9 lg:w-9">
                {isActive ? (
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-8 w-8 rounded-lg lg:h-9 lg:w-9"
                    style={{ backgroundColor: "rgba(255,255,255,0.95)" }}
                  />
                ) : null}
                <span
                  className={`relative flex h-8 w-8 items-center justify-center rounded-lg lg:h-9 lg:w-9 ${
                    isActive ? "translate-x-[2px]" : ""
                  }`}
                  style={{ backgroundColor: "#128197" }}
                >
                  <SidebarImageIcon src={item.iconSrc} size={item.iconSize} />
                </span>
              </span>
              <span
                className="text-[11px] leading-tight sm:text-[12px] lg:text-[14px]"
                style={{ color: isActive ? "rgba(249,250,251,0.98)" : "rgba(232,246,252,0.75)" }}
              >
                {item.label}
              </span>
            </>
          );

          if (item.label === "Logout") {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => setLogoutOpen(true)}
                className="relative flex w-full flex-col items-center gap-2 rounded-xl px-2 py-2.5 text-center transition lg:flex-row lg:gap-4 lg:py-3 lg:text-left"
                style={{
                  color: theme.colors.themeWhite,
                  backgroundColor: "transparent",
                }}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center gap-2 rounded-xl px-2 py-2.5 text-center transition lg:flex-row lg:gap-4 lg:py-3 lg:text-left"
              style={{
                color: theme.colors.themeWhite,
                backgroundColor: "transparent",
              }}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      <ConfirmModal
        open={logoutOpen}
        title="Log out?"
        description="You will need to sign in again to access the admin panel."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        onConfirm={async () => {
          setLogoutOpen(false);
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
        }}
        onCancel={() => setLogoutOpen(false)}
      />
    </aside>
  );
}
