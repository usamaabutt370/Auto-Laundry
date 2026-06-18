import { theme } from "@/lib/theme/theme";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

const baseButtonStyle = {
  color: theme.colors.themeWhite,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.colors.filledButtonBorder,
  backgroundColor: theme.colors.secondary,
  fontWeight: theme.fontWeights.medium,
} as const;

export function Button({ className = "", style, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`h-11 w-full rounded-full text-base sm:h-12 sm:text-lg ${className}`.trim()}
      style={{ ...baseButtonStyle, ...style }}
    >
      {children}
    </button>
  );
}
