"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";

/** دکمهٔ امضای قرارداد الکترونیکی → POST /api/portal/cases/[id]/contract/sign */
export function SignContractButton({ caseId, signed }: { caseId: number; signed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (signed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">
        <Icon name="badge" className="h-3.5 w-3.5" />
        امضاشده
      </span>
    );
  }

  async function sign() {
    setBusy(true);
    try {
      const res = await fetch(`/api/portal/cases/${caseId}/contract/sign`, { method: "POST" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        toast.success("قرارداد امضا شد و برای طرفین ثبت گردید.");
        router.refresh();
      } else {
        toast.error(data.error ?? "امضای قرارداد ناموفق بود.");
      }
    } catch {
      toast.error("ارتباط با سرور برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="accent" size="sm" onClick={() => void sign()} disabled={busy}>
      <Icon name="stamp" className="h-4 w-4" />
      {busy ? "..." : "امضای وکیل"}
    </Button>
  );
}
