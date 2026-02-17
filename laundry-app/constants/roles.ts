import type { UserRole } from '@/types/user';

import { strings } from '@/constants/strings';

/** Display labels for each role (from centralized strings). */
export const ROLE_LABELS: Record<UserRole, string> = {
  customer: strings.auth.roles.customer,
  launderer: strings.auth.roles.launderer,
};

/** All roles (useful for iteration, e.g. role selection screen). */
export const USER_ROLES: UserRole[] = ['customer', 'launderer'];
