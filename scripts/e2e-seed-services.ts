// Surface the real seed error + force-seed the managed services catalog into the LOCAL e2e DB.
import { Client } from "pg";
import { CATALOG_CATEGORIES, CATALOG_SERVICES } from "../src/lib/managed-catalog";

const c = new Client({ connectionString: "postgres://postgres@127.0.0.1:54329/dadban_e2e" });
await c.connect();

try {
  for (const cat of CATALOG_CATEGORIES) {
    await c.query(
      `INSERT INTO service_categories (slug, name, description, icon, sort_order) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slug) DO NOTHING`,
      [cat.slug, cat.name, cat.description, cat.icon, cat.sortOrder],
    );
  }
  for (const s of CATALOG_SERVICES) {
    await c.query(
      `INSERT INTO managed_services
        (title, slug, short_description, description, classification, category, icon, estimated_time,
         price_type, base_price, requires_case_info, requires_documents, requires_lawyer, requires_supervision,
         active, featured, sort_order, required_docs)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (slug) DO NOTHING`,
      [s.title, s.slug, s.shortDescription, s.description, s.classification, s.category, s.icon, s.estimatedTime,
       s.priceType, s.basePrice, s.requiresCaseInfo, s.requiresDocuments, s.requiresLawyer, s.requiresSupervision,
       s.active, s.featured, s.sortOrder, s.requiredDocs ? JSON.stringify(s.requiredDocs) : null],
    );
  }
  const r = await c.query(`SELECT count(*)::int AS n FROM managed_services`);
  const a = await c.query(`SELECT slug, price_type, base_price FROM managed_services WHERE active = true ORDER BY id LIMIT 3`);
  console.log("seeded services:", r.rows[0].n, "| first active:", JSON.stringify(a.rows));
} catch (e) {
  console.error("SEED ERROR:", e instanceof Error ? e.message : e);
}
await c.end();
