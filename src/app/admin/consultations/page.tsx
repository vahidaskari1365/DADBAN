import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import AdminManager from "@/components/admin-manager";
export const dynamic = "force-dynamic";
export default async function AdminConsultationsPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  return <AdminManager resource="consultations" />;
}
