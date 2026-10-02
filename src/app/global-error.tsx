"use client";

/**
 * Last-resort error boundary for errors thrown in the root layout itself.
 * Replaces the entire document, so it must render its own <html>/<body>
 * and must not depend on the site's fonts or providers.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body style={{ margin: 0, background: "#f5f7fb", color: "#141416", fontFamily: "Vazirmatn, system-ui, Tahoma, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "#ffffff",
              border: "1px solid #e3e6ef",
              borderRadius: "24px",
              padding: "32px 28px",
              textAlign: "center",
              boxShadow: "0 12px 32px rgba(20, 22, 28, 0.08)",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "16px",
                background: "#fdf3e7",
                color: "#b45309",
              }}
            >
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
            </div>
            <h1 style={{ marginTop: "20px", fontSize: "20px", fontWeight: 700 }}>خطایی رخ داد</h1>
            <p style={{ marginTop: "8px", fontSize: "14px", lineHeight: 1.9, color: "#5b5f6e" }}>
              مشکلی در بارگذاری سایت پیش آمد. دوباره تلاش کنید؛ اگر مشکل ادامه داشت، کمی بعد مراجعه کنید.
            </p>
            <div style={{ marginTop: "24px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  padding: "10px 22px",
                  borderRadius: "12px",
                  border: "none",
                  background: "#15365d",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                تلاش دوباره
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/";
                }}
                style={{
                  padding: "10px 22px",
                  borderRadius: "12px",
                  border: "1px solid #e3e6ef",
                  background: "#ffffff",
                  color: "#141416",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                بازگشت به خانه
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
