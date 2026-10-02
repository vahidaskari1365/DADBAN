// Runs once on server startup. Automatically provisions the database so the
// platform always boots with the correct schema and seed data — no manual steps.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureSeeded } = await import("./lib/auto-seed");
    const res = await ensureSeeded();
    if (res.seeded) {
      console.log("[dadban] auto-seed: database provisioned with seed data.");
    }
  } catch (e) {
    console.error("[dadban] auto-seed failed:", e);
  }
}
