# Šablona promptu: vygenerovat kvíz z prezentace

Zkopíruj níže uvedený prompt do Claudu, přilož prezentaci (nebo vlož její text) a doplň hranaté závorky. Výstup pak vlož v aplikaci přes **+ Kvíz**.

---

Z přiložené prezentace vytvoř kvíz pro studenty **[třída, např. Prima – 11–12 let]** z předmětu informatika. Kvíz má mít **[počet, např. 10]** otázek, mix typů: většinu `single`, 1–2 `multi`, 2 `boolean`, 1–2 `text` a případně jednu `matching`. Otázky formuluj česky, srozumitelně pro danou věkovou skupinu, ptej se na podstatné věci z prezentace (ne na detaily formátování). Ke každé otázce napiš krátké `explain` (1–2 věty), které vysvětlí správnou odpověď.

Výstup vrať **pouze jako JSON** v přesně tomto formátu, bez komentářů a bez textu okolo:

```json
{
  "title": "Název kvízu",
  "description": "Jedna věta pro studenty.",
  "questions": [
    { "type": "single",   "text": "…", "options": ["…", "…", "…", "…"], "correct": [0], "explain": "…" },
    { "type": "multi",    "text": "… (více správných odpovědí)", "options": ["…", "…", "…", "…"], "correct": [0, 2], "explain": "…" },
    { "type": "boolean",  "text": "…", "correct": true, "explain": "…" },
    { "type": "text",     "text": "… (napiš jedno slovo)", "accept": ["odpověď", "varianta"], "explain": "…" },
    { "type": "matching", "text": "Přiřaď…", "pairs": [{ "left": "…", "right": "…" }, { "left": "…", "right": "…" }, { "left": "…", "right": "…" }], "explain": "…" }
  ]
}
```

Pravidla:
- `correct` jsou indexy možností od nuly; u `single` právě jeden index.
- U `text` uveď v `accept` všechny rozumné varianty správné odpovědi (bez ohledu na diakritiku a velikost písmen).
- U `matching` dej 3–4 dvojice, pravé strany musí být jednoznačné.
- Nepřidávej žádná další pole.
