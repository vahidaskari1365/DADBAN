"use client";

import { Button } from "@/components/ui";

/**
 * دکمهٔ خروجی CSV برای جدول گزارش روزانهٔ بازدید — تولید فایل سمت مرورگر
 * با BOM UTF-8 تا اعداد و تاریخ‌ها در Excel فارسی درست باز شوند.
 */
export function CsvExportButton({
  rows,
  filename,
  label,
}: {
  rows: { day: string; views: number; uniq: number }[];
  filename: string;
  label?: string;
}) {
  const download = () => {
    try {
      const header = "day,pageviews,unique_visitors";
      const body = rows.map((r) => `${r.day},${r.views},${r.uniq}`).join("\n");
      const blob = new Blob(["\uFEFF" + header + "\n" + body + "\n"], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      /* بی‌صدا — دکمه فقط یک راحتی است */
    }
  };

  return (
    <Button onClick={download} variant="ghost" size="sm" icon="download" data-testid="analytics-csv">
      {label ?? "خروجی CSV"}
    </Button>
  );
}
