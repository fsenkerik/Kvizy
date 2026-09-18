# Kvízovna

Školní kvízy z informatiky na jednom odkazu. Student klikne na svou třídu, vybere jméno, zadá PIN a vyplňuje. Učitel spravuje skupiny tříd → třídy → studenty → témata → kvízy a odkazy na cvičení a vidí, kdo co vyplnil a jak odpovídal.

- **Stack:** Next.js (App Router) · Tailwind · Drizzle ORM · Postgres (Neon) · Vercel
- **Dokumentace:** [nasazení a provoz](docs/nasazeni.md) · [formát kvízu](docs/format-kvizu.md) · [prompt pro generování kvízu](docs/prompt-generovani-kvizu.md)

## Rychlý start

```bash
npm install
cp .env.example .env.local   # doplň AUTH_SECRET
npm run db:migrate
npm run create-teacher -- --email ucitel@test.cz --name "Test" --password heslo1234 --admin
npm run dev
```

Otevři `http://localhost:3000` (studenti) a `http://localhost:3000/ucitel` (učitel).

## Struktura

```
app/            stránky a server actions (app/actions)
  trida/        studentská část – přihlášení do třídy, témata, kvíz, výsledek
  ucitel/       učitelská administrace
components/     UI komponenty (ui/), kvíz (quiz/), administrace (teacher/)
lib/db          schéma, připojení (Neon / PGlite), dotazy
lib/auth        session (JWT v cookie), hesla, guardy
lib/quiz        formát kvízu (zod), hodnocení, veřejná verze otázek
scripts/        migrace, založení učitele, převod HTML kvízů
content/        převedené kvízy (JSON) a jejich HTML předlohy
docs/           dokumentace
```
