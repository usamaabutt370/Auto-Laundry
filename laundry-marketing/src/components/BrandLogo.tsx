import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  /** Text next to mark */
  showWordmark?: boolean;
  /** Light text (on hero / dark overlays) */
  variant?: "onDark" | "onLight";
};

export function BrandLogo({
  showWordmark = true,
  variant = "onLight",
}: BrandLogoProps) {
  const isDark = variant === "onDark";

  return (
    <Link
      href="/"
      aria-label="Laundri home"
      className={`flex items-center gap-2.5 ${isDark ? "text-white" : "text-foreground"}`}
    >
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl sm:h-11 sm:w-11">
        <Image
          src="/images/logos/laundri.png"
          alt=""
          width={88}
          height={88}
          className="h-full w-full object-cover"
          priority
        />
      </span>
      {showWordmark && (
        <span className="font-heading text-lg font-bold tracking-tight sm:text-xl">Laundri</span>
      )}
    </Link>
  );
}
