"use client";

import { theme } from "@/lib/theme/theme";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { href: "/order", label: "Order", iconSrc: "/icons/file-checked.svg", iconSize: 20 },
  { href: "/settings", label: "Settings", iconSrc: "/icons/setting.svg", iconSize: 22 },
  { href: "/profile", label: "Profile", iconSrc: "/icons/file-checked.svg", iconSize: 20 },
  { href: "/dashboard", label: "Dashboard", iconSrc: "/icons/file-checked.svg", iconSize: 20 },
  { href: "/support", label: "Support", iconSrc: "/icons/support.svg", iconSize: 20 },
  { href: "/faq", label: "FAQ", iconSrc: "/icons/faq.svg", iconSize: 20 },
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

  return (
    <aside
      className="w-full max-w-[248px] shrink-0 border-r px-3 py-4 sm:px-4"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: theme.colors.sidebarBackground,
      }}
    >
      <div className="mb-4 flex items-center justify-between px-1 pt-2">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 overflow-hidden rounded-full border border-white/20 bg-[#5a6d79]">
            <div className="flex h-full w-full items-center justify-center text-[11px] text-white/80">
              KB
            </div>
          </div>
          <div>
            <p
              className="text-[18px] leading-5"
              style={{ color: theme.colors.themeWhite, fontWeight: theme.fontWeights.medium }}
            >
              Kelly Burke
            </p>
            <p className="text-[11px] leading-4 text-white/70">info@gmail.com</p>
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

      <p className="mb-2 mt-3 px-2 text-[18px] font-bold text-white/90">
        Menu
      </p>

      <nav className="space-y-1.5 border-t border-white/8 pt-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center gap-4 rounded-xl px-2 py-3 text-[30px] transition"
              style={{
                color: theme.colors.themeWhite,
                backgroundColor: "transparent",
              }}
            >
              <span className="relative flex h-12 w-12 items-center">
                {isActive ? (
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-12 w-12 rounded-xl"
                    style={{ backgroundColor: "rgba(255,255,255,0.95)" }}
                  />
                ) : null}
                <span
                  className={`relative flex h-12 w-12 items-center justify-center rounded-xl ${
                    isActive ? "translate-x-[3px]" : ""
                  }`}
                  style={{ backgroundColor: "#128197" }}
                >
                  <SidebarImageIcon src={item.iconSrc} size={item.iconSize} />
                </span>
              </span>
              <span
                className="text-[18px] leading-none"
                style={{ color: isActive ? "rgba(249,250,251,0.98)" : "rgba(232,246,252,0.75)" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
