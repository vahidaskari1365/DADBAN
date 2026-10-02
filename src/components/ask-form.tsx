"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";

export function AskForm() {
  const [q, setQ] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      setSent(true);
      setQ("");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-5 text-center">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-success/15 text-success">
          <Icon name="check" className="h-6 w-6" />
        </span>
        <p className="mt-3 text-sm font-bold text-foreground">سؤال شما ثبت شد!</p>
        <p className="mt-1 text-xs text-muted">پس از بررسی توسط وکلای دادبان، پاسخ منتشر خواهد شد.</p>
        <button onClick={() => setSent(false)} className="mt-3 text-xs font-medium text-primary hover:text-primary-hover">
          پرسیدن سؤال دیگر
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Icon name="chat" className="h-4 w-4 text-primary" /> سؤال حقوقی خود را بپرسید
      </h3>
      <p className="mt-1 text-xs text-muted">سؤال شما توسط وکلای متخصص بررسی و پاسخ داده می‌شود.</p>
      <textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        rows={3}
        placeholder="سؤال خود را بنویسید…"
        className="mt-3 w-full resize-y rounded-xl border border-border-strong bg-background p-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
      />
      <Button onClick={submit} disabled={loading || !q.trim()} icon="send" className="mt-3 w-full" size="sm">
        {loading ? "در حال ارسال…" : "ارسال سؤال"}
      </Button>
    </div>
  );
}
