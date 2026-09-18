# Nasazení a provoz

## Co je kde

| Služba | K čemu | Free tier |
|---|---|---|
| **GitHub** (`fsenkerik/Kvizy`) | zdrojový kód | ano |
| **Vercel** | hosting aplikace, build po každém pushi do `main` | Hobby |
| **Neon** (přes Vercel Marketplace) | Postgres databáze | 0,5 GB, sama se uspí a probudí |

## První nasazení (jednorázově)

1. **Vercel → Add New Project → Import** repozitář `fsenkerik/Kvizy`.
   - Root Directory: `kvizovna` (aplikace je v podsložce)
   - Framework: Next.js (rozpozná se sám)
2. **Storage → Create Database → Neon** (free plán). Vercel sám přidá proměnnou `DATABASE_URL`.
3. **Settings → Environment Variables** – přidej:
   - `AUTH_SECRET` – náhodný řetězec, vygeneruj lokálně:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
     ```
   - `NEXT_PUBLIC_APP_URL` – adresa aplikace, např. `https://kvizy.vercel.app` (tiskne se na kartičky s PINy)
4. **Deploy** (nebo push do `main`).
5. **Migrace databáze** – lokálně, jednorázově (a pak po každé změně schématu):
   ```bash
   # do .env.local vlož DATABASE_URL z Vercelu (Storage → Neon → .env.local tab) a AUTH_SECRET
   npm run db:migrate
   ```
6. **První učitelský účet** (admin):
   ```bash
   npm run create-teacher -- --email tvuj@email.cz --name "Jméno Příjmení" --password TajneHeslo123 --admin
   ```
   Další učitele přidáš už v aplikaci (Učitelé → + Učitel).

## Běžný provoz

- Změna kódu → `git push` → Vercel nasadí automaticky (1–2 min).
- Změna schématu DB (`lib/db/schema.ts`) → `npm run db:generate` → `npm run db:migrate` (proti Neonu) → commit složky `drizzle/`.
- Adresa pro studenty: `https://<app>/` – vyberou třídu, jméno, PIN. Přímý odkaz na třídu je v detailu třídy.
- PINy: detail třídy → **Tisk PINů** (kartičky k rozstříhání). Nový PIN vygeneruješ u studenta tlačítkem **Nový PIN**.

## Lokální vývoj (bez cloudu)

```bash
npm install
cp .env.example .env.local      # vyplň AUTH_SECRET, DATABASE_URL nech prázdné
npm run db:migrate              # vytvoří lokální PGlite databázi ve složce .pglite
npm run create-teacher -- --email ucitel@test.cz --name "Test" --password heslo1234 --admin
npm run dev                     # http://localhost:3000
```

Bez `DATABASE_URL` aplikace používá PGlite (Postgres ve WASM) – data jsou ve složce `.pglite`, která je v `.gitignore`.

## Užitečné příkazy

| Příkaz | Co dělá |
|---|---|
| `npm run dev` | vývojový server |
| `npm run build` | produkční build (stejný jako na Vercelu) |
| `npm test` | testy hodnocení, validace JSON a převodu HTML kvízů |
| `npm run typecheck` | kontrola typů |
| `npm run convert-quiz -- soubor.html` | převod starého HTML kvízu do JSON (`content/quizzes/`) |
| `npm run db:studio` | prohlížeč databáze (Drizzle Studio) |
