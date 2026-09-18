# Formát kvízu (JSON)

Kvíz se do aplikace vkládá jako JSON – v detailu tématu tlačítkem **+ Kvíz**. Během psaní se JSON průběžně kontroluje a ukazuje náhled otázek.

```json
{
  "title": "Hardware",
  "description": "Nepovinný popis, zobrazí se studentům nad kvízem.",
  "questions": [
    {
      "type": "single",
      "text": "Co je základní deska?",
      "options": ["Deska spojující komponenty", "Disk", "Procesor", "Grafická karta"],
      "correct": [0],
      "explain": "Základní deska (motherboard) spojuje všechny komponenty."
    },
    {
      "type": "multi",
      "text": "HDMI slouží k připojení… (více správných)",
      "options": ["Monitoru", "Klávesnice", "Projektoru", "Myši"],
      "correct": [0, 2],
      "explain": "HDMI přenáší obraz i zvuk."
    },
    {
      "type": "boolean",
      "text": "SSD je rychlejší než HDD.",
      "correct": true,
      "explain": "SSD nemá mechanické části."
    },
    {
      "type": "text",
      "text": "Kolik GB má 1 TB? (napiš jen číslo)",
      "accept": ["1000", "1024"],
      "explain": "Obě odpovědi se uznávají."
    },
    {
      "type": "matching",
      "text": "Přiřaď výrobce k produktu:",
      "pairs": [
        { "left": "Intel", "right": "Core i7" },
        { "left": "AMD", "right": "Ryzen" },
        { "left": "NVIDIA", "right": "GeForce RTX" }
      ],
      "distractors": ["Radeon"],
      "explain": "Radeon jsou grafické karty AMD."
    }
  ]
}
```

## Typy otázek

| `type` | Povinná pole | Poznámka |
|---|---|---|
| `single` | `options`, `correct` (pole s **jedním** indexem, od 0) | výběr jedné odpovědi |
| `multi` | `options`, `correct` (pole indexů) | započítá se jen úplně správná kombinace |
| `boolean` | `correct` (`true` / `false`) | Pravda / Nepravda |
| `text` | `accept` (pole přijímaných odpovědí) | porovnává se bez ohledu na velikost písmen, diakritiku a interpunkci |
| `matching` | `pairs` (`left` + `right`), volitelně `distractors` | pravé strany se studentům zamíchají; bod jen za všechny správné dvojice |

Společná volitelná pole u každé otázky:

- `explain` – vysvětlení, zobrazí se po vyhodnocení (pokud to kvíz povoluje)
- `points` – body za otázku (výchozí 1)
- `id` – doplní se automaticky; při úpravě už uloženého kvízu ho **neměň**, jinak se starší pokusy nespárují s otázkou

## Tipy

- Indexy v `correct` se počítají od nuly: první možnost = `0`.
- U `text` uveď víc variant (`["memory", "paměť"]`), aby se uznaly rozumné odpovědi.
- Nastavení kvízu (počet pokusů, zobrazení odpovědí, otevřeno/zavřeno) není v JSON – mění se v detailu kvízu.
- Hotový HTML kvíz v původním formátu nahraješ přímo v tématu tlačítkem **Nahrát HTML** – převede se sám. (Totéž z příkazové řádky: `npm run convert-quiz -- cesta/kviz.html` → `content/quizzes/`.)
