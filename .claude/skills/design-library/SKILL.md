---
name: design-library
description: >-
  Library of 84 DESIGN.md design-system documents extracted from real websites
  (Apple, Airbnb, Linear, Stripe, Notion, Vercel and more) from VoltAgent/awesome-design-md.
  Use when building or restyling a page that should look like a specific reference brand,
  or when the user names a website as a visual reference — read the matching DESIGN.md
  from design-md/<brand>/DESIGN.md and apply its tokens, type scale, palette and
  component patterns. Also useful for choosing a coherent art direction for new pages.
---

# Design Library — مجموعه DESIGN.md

۸۴ سند سیستم‌دیزاین استخراج‌شده از سایت‌های واقعی (VoltAgent/awesome-design-md).

## نحوه استفاده

1. برند مرجع را پیدا کن: `ls design-md/<brand>/DESIGN.md`
2. فایل DESIGN.md برند را کامل بخوان — شامل: جوهره بصری، پالت، تایپوگرافی، فاصله‌گذاری، شعاع گوشه‌ها، الگوی کامپوننت‌ها، قواعد Do/Don't
3. توکن‌ها را با سیستم فعلی پروژه (Tailwind + CSS variables در globals.css) تطبیق بده — هرگز سند را کورکورانه کپی نکن؛ رنگ‌ها باید با تم روشن/تاریک و RTL سازگار بمانند
4. برای صفحات فارسی/RTL: جهت، فونت (وزیرمتن) و تراز را از سیستم دادورزان بگیر و فقط «زبان بصری» را از DESIGN.md وام بگیر

## فهرست برندهای موجود

`design-md/` شامل: apple، airbnb، linear، stripe، notion، vercel، binance، bmw، claude، cursor، elevenlabs، openai، spotify، telegram، whatsapp، imdb، github و ده‌ها برند دیگر.

## قاعده طلایی با پروژه دادورزان

دادورزان هویت بصری خودش را دارد (آبی اعتماد + طلایی عدالت، وزیرمتن، کارت‌های نرم).
از این کتابخانه برای **الگوهای چیدمان، سلسله‌مراتب تایپ و جزئیات craft** استفاده کن،
نه برای جایگزینی هویت برند. ظاهر صفحات موجود را خراب نکن — فقط صفحات جدید را
با همان استاندارد craft بساز.
