import { AppHeader, type AppHeaderProps } from "@/components/app-header";

export type PartnerHeaderProps = AppHeaderProps;

/**
 * Backward-compatible alias while screens migrate to AppHeader.
 */
export function PartnerHeader(props: PartnerHeaderProps) {
  return <AppHeader {...props} />;
}
