/* helpers سروری تیم وکیل — فقط سمت سرور import شود */
import { db } from "@/db";
import { teamMembers } from "@/db/schema-marketplace";
import { eq } from "drizzle-orm";

export type TeamMemberView = {
  id: number;
  name: string;
  email: string;
  role: string;
  scope: string;
  status: string;
};

/** اعضای تیم وکیل جاری (serialize برای کامپوننت کلاینت) */
export async function getTeamMembersView(lawyerId: number): Promise<TeamMemberView[]> {
  try {
    const rows = (await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.lawyerId, lawyerId))
      .limit(50)) as (typeof teamMembers.$inferSelect)[];
    const list = Array.isArray(rows) ? rows : [];
    return list.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: String(m.role),
      scope: m.scope,
      status: String(m.status),
    }));
  } catch {
    return [];
  }
}
