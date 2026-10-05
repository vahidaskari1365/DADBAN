import { getCurrentUser } from "@/lib/user-auth";
import type { User } from "@/db/schema";

/**
 * «کارپرداز وکیل» — هم خودِ وکیل (role=lawyer با lawyerId) و هم عضو تیم او
 * (role=team با parentLawyerId و دسترسی‌های CSV) با همین یک interface به
 * APIهای پنل دسترسی پیدا می‌کنند؛ سطح دسترسی عضو تیم با can() کنترل می‌شود.
 */
export type LawyerActor = {
  lawyerId: number;
  userId: number;
  role: "lawyer" | "team";
  /** فقط برای role=team — لیست دسترسی‌های داده‌شده به عضو تیم */
  permissions: string[];
  /** وکیل مادر همیشه همه‌چیز را می‌تواند؛ عضو تیم فقط دسترسی‌های خودش را */
  can: (perm: string) => boolean;
  user: User;
};

export async function getLawyerActor(perm?: string): Promise<LawyerActor | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "lawyer" && user.lawyerId) {
    return {
      lawyerId: user.lawyerId,
      userId: user.id,
      role: "lawyer",
      permissions: [],
      can: () => true,
      user,
    };
  }
  if (user.role === "team" && user.parentLawyerId) {
    const perms = (user.teamPermissions ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const actor: LawyerActor = {
      lawyerId: user.parentLawyerId,
      userId: user.id,
      role: "team",
      permissions: perms,
      can: (p) => perms.includes(p),
      user,
    };
    if (perm && !actor.can(perm)) return null;
    return actor;
  }
  return null;
}

/** شکل درست‌شدهٔ دسترسی‌های مجاز */
export const TEAM_PERMISSIONS = ["offers", "consultations", "reminders", "services", "cases"] as const;
