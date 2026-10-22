import { Client } from "pg";

/**
 * دادهٔ تست لوکال برای پروب بصری کارت وکیل — ۱۰ رکورد با ترکیب انواع.
 */
const rows = [
  { slug: "sara-mohammadi", name: "سارا محمدی", type: "wakil", title: "وکیل پایه یک دادگستری", license: "۴۵۲۱۰", city: "تهران", province: "استان تهران", gender: "female", exp: 12, spec: ["خانواده", "ارث", "مالیاتی"], rating: 4.9, rc: 128, cases: 342, chat: 250000, color: "#15365d", featured: true, services: ["تنظیم دادخواست طلاق", "مشاوره مهر و نفقه"], bio: "وکیل پایه یک دادگستری با بیش از یک دهه تجربه در دعاوی خانواده و ارث." },
  { slug: "reza-karimi", name: "رضا کریمی", type: "wakil", title: "وکیل پایه یک دادگستری", license: "۴۸۸۷۳", city: "مشهد", province: "خراسان رضوی", gender: "male", exp: 8, spec: ["کیفری", "ملک"], rating: 4.7, rc: 86, cases: 210, chat: 180000, color: "#7a4b12", featured: true, services: ["تنظیم لوایح دفاعیه"], bio: "دفاع از متهم و وکیل دعاوی ملکی، متخصص چک و اسناد." },
  { slug: "mina-ahmadi", name: "مینا احمدی", type: "wakil", title: "وکیل پایه یک دادگستری", license: "۴۱۱۲۷", city: "اصفهان", province: "استان اصفهان", gender: "female", exp: 15, spec: ["تجارت", "قراردادها", "شرکت‌ها"], rating: 4.8, rc: 97, cases: 401, chat: 320000, color: "#0f5132", featured: true, services: ["تنظیم قرارداد تجاری", "ثبت شرکت"], bio: "مشاور قراردادهای بازرگانی و امور شرکت‌های تجاری." },
  { slug: "ali-rezaei", name: "علی رضایی", type: "wakil", title: "وکیل پایه یک دادگستری", license: "۵۰۱۲۴", city: "شیراز", province: "استان فارس", gender: "male", exp: 6, spec: ["کار", "مالیاتی"], rating: 4.5, rc: 54, cases: 133, chat: 150000, color: "#5b2c6f", featured: false, services: [], bio: "" },
  { slug: "hamed-jafari", name: "حامد جعفری", type: "wakil", title: "وکیل پایه یک دادگستری", license: "۵۳۳۹۰", city: "تبریز", province: "آذربایجان شرقی", gender: "male", exp: 10, spec: ["ملک", "چک و اسناد", "کیفری"], rating: 4.6, rc: 71, cases: 265, chat: 200000, color: "#15365d", featured: false, services: ["اقامه دعوای الزام به تنظیم سند"], bio: "دعاوی ملک و املاک، الزام به تنظیم سند رسمی." },
  { slug: "nazanin-hosseini", name: "نازنین حسینی", type: "wakil", title: "وکیل پایه یک دادگستری", license: "۵۶۱۱۰", city: "کرج", province: "استان البرز", gender: "female", exp: 9, spec: ["خانواده", "مهاجرت"], rating: 4.4, rc: 39, cases: 118, chat: 170000, color: "#8a3b12", featured: false, services: [], bio: "" },
  { slug: "fateme-nouri", name: "فاطمه نوری", type: "karamooz", title: "کارآموز وکالت", license: "K-۱۴۰۲-۸۸۷", city: "تهران", province: "استان تهران", gender: "female", exp: 3, spec: ["خانواده", "ارث"], rating: 4.3, rc: 21, cases: 44, chat: 90000, color: "#0f5132", featured: false, services: [], bio: "کارآموز وکالت با تمرکز بر دعاوی خانواده." },
  { slug: "mehdi-sadeghi", name: "مهدی صادقی", type: "karamooz", title: "کارآموز وکالت", license: "K-۱۴۰۱-۵۴۳", city: "اصفهان", province: "استان اصفهان", gender: "male", exp: 2, spec: ["ملک", "چک و اسناد"], rating: 4.2, rc: 14, cases: 27, chat: 80000, color: "#5b2c6f", featured: false, services: [], bio: "" },
  { slug: "nadia-mohammadi", name: "نادیا محمدی", type: "expert", title: "کارشناس حقوقی", license: "E-۱۰۲۳", city: "تهران", province: "استان تهران", gender: "female", exp: 7, spec: ["قراردادها", "ثبت برند"], rating: 4.8, rc: 63, cases: 190, chat: 120000, color: "#7a4b12", featured: false, services: ["تنظیم و بازبینی قرارداد", "ثبت برند و علامت تجاری"], bio: "کارشناس حقوقی؛ تنظیم قرارداد، داوری و ثبت برند." },
  { slug: "kaveh-taheri", name: "کاوه طاهری", type: "expert", title: "کارشناس حقوقی", license: "E-۲۰۴۱", city: "مشهد", province: "خراسان رضوی", gender: "male", exp: 11, spec: ["کار", "مالیاتی", "قراردادها"], rating: 4.7, rc: 52, cases: 240, chat: 140000, color: "#15365d", featured: false, services: ["مشاوره حقوق کار", "تنظیم قرارداد کار"], bio: "" },
];

const c = new Client({ connectionString: "postgresql://postgres:postgres@127.0.0.1:5434/dadban" });
await c.connect();
for (const r of rows) {
  await c.query(
    `INSERT INTO lawyers (slug, name, lawyer_type, title, license_no, city, province, gender, experience_years, specialties, rating, review_count, case_count, price_chat, price_voice, price_video, verified, featured, avatar_color, bio, services)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true,$17,$18,$19,$20)
     ON CONFLICT (slug) DO NOTHING`,
    [r.slug, r.name, r.type, r.title, r.license, r.city, r.province, r.gender, r.exp, r.spec, r.rating, r.rc, r.cases, r.chat, Math.round(r.chat * 1.4), Math.round(r.chat * 1.8), r.featured, r.color, r.bio, r.services],
  );
}
const { rows: cnt } = await c.query("SELECT count(*)::int AS n FROM lawyers");
console.log("lawyers seeded:", cnt[0].n);
await c.end();
