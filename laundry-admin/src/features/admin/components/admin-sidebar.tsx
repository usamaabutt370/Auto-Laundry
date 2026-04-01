"use client";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { theme } from "@/lib/theme/theme";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", iconSrc: "/icons/file-checked.svg", iconSize: 20 },
  { href: "/orders", label: "Orders", iconSrc: "/icons/file-checked.svg", iconSize: 20 },
  { href: "/users", label: "Users", iconSrc: "/icons/support.svg", iconSize: 20 },
  { href: "/partner-kyc", label: "Partner KYC", iconSrc: "/icons/file-checked.svg", iconSize: 20 },
  { href: "/subscriptions", label: "Subscriptions", iconSrc: "/icons/support.svg", iconSize: 20 },
  { href: "/disputes", label: "Disputes", iconSrc: "/icons/faq.svg", iconSize: 20 },
  { href: "/settings", label: "Settings", iconSrc: "/icons/setting.svg", iconSize: 22 },
  { href: "/login", label: "Logout", iconSrc: "/icons/faq.svg", iconSize: 20 },
];

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
              Kelly Burke
            </p>
            <p className="hidden text-[11px] leading-4 text-white/70 sm:block">info@gmail.com</p>
          </div>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/6"
          aria-label="Settings"
        >
          <SidebarImageIcon src="/icons/setting.svg" size={16} />
        </button>
      </div>

      <p className="mb-2 mt-2 px-2 text-[15px] font-bold text-white/90 lg:mt-3 lg:text-[18px]">
        Menu
      </p>

      <nav className="grid grid-cols-3 gap-2 border-t border-white/8 pt-2 sm:grid-cols-6 lg:grid-cols-1 lg:gap-1.5">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const content = (
            <>
              <span className="relative flex h-10 w-10 items-center justify-center lg:h-12 lg:w-12">
                {isActive ? (
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-10 w-10 rounded-xl lg:h-12 lg:w-12"
                    style={{ backgroundColor: "rgba(255,255,255,0.95)" }}
                  />
                ) : null}
                <span
                  className={`relative flex h-10 w-10 items-center justify-center rounded-xl lg:h-12 lg:w-12 ${
                    isActive ? "translate-x-[3px]" : ""
                  }`}
                  style={{ backgroundColor: "#128197" }}
                >
                  <SidebarImageIcon src={item.iconSrc} size={item.iconSize} />
                </span>
              </span>
              <span
                className="text-[12px] leading-none sm:text-[13px] lg:text-[18px]"
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
        onConfirm={() => {
          setLogoutOpen(false);
          router.push("/login");
        }}
        onCancel={() => setLogoutOpen(false)}
      />
    </aside>
  );
}
