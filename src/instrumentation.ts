// Runs once on server startup. Automatically provisions the database so the
// platform always boots with the correct schema and seed data — no manual steps.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureMarketplaceSchema } = await import("./lib/marketplace-migrate");
    await ensureMarketplaceSchema();
  } catch (e) {
    console.error("[dadpayo] marketplace migration failed:", e);
  }
  try {
    const { ensureSeeded } = await import("./lib/auto-seed");
    const res = await ensureSeeded();
    if (res.seeded) {
      console.log("[dadpayo] auto-seed: database provisioned with seed data.");
    }
  } catch (e) {
    console.error("[dadpayo] auto-seed failed:", e);
  }
}
