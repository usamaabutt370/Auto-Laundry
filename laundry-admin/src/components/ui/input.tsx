import { theme } from "@/lib/theme/theme";
import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

const baseInputStyle = {
  color: theme.colors.white,
  borderColor: theme.colors.filledButtonBorder,
  backgroundColor: "transparent",
} as const;

export function Input({ className = "", style, ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`login-input h-11 w-full rounded-full border bg-transparent px-5 text-sm outline-none focus:bg-transparent active:bg-transparent sm:h-12 ${className}`.trim()}
      style={{ ...baseInputStyle, ...style }}
    />
  );
}
