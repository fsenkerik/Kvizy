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

## Body pro studenty

- U každého kvízu nastavíš **Body za kvíz při 100 %** (výchozí 10). Student dostane body podle procent z **posledního** pokusu (85 % z 10 = 9 b.); další pokus tedy body přepíše, nesčítá.
- U odkazu na cvičení nastavíš **Body za splnění** (výchozí 5). Student je dostane, když odkaz otevře a nechá stránku Kvízovny otevřenou alespoň 45 s – čas hlídá server.
- Body se vedou v samostatné „bodové knize“, takže zůstanou i po skrytí tématu nebo smazání kvízu. Smazání pokusů studenta (Výsledky → Smazat) body z daného kvízu přepočítá.
- Student vidí body v hlavičce (⭐) s ukazatelem vůči momentálně dosažitelnému maximu; učitel v matici *Výsledky třídy* ve sloupci ⭐ Body.

## Náhled kvízu

Po nahrání (nebo kdykoli později) si kvíz projdi tlačítkem **👁 Náhled** – v seznamu kvízů u tématu i v detailu kvízu. Uvidíš ho přesně jako student včetně vyhodnocení, správných odpovědí a vysvětlení, ale **nic se neukládá**: nevznikne pokus, nepřipíšou se body a ve výsledcích se náhled neobjeví.

## Míchání otázek a odpovědí

U každého kvízu jsou v *Nastavení* dva přepínače, **oba zapnuté** (lze je vypnout):

- **Zamíchat pořadí otázek** – každý student dostane otázky v jiném pořadí.
- **Zamíchat pořadí odpovědí** – zamíchají se možnosti u výběrových otázek i pravé strany u párování. (Pravda/Nepravda a doplňovačky nemají co míchat.)

Pořadí je pro daného studenta stálé – po obnovení stránky se nezamíchá znovu. Hodnocení i uložené výsledky pracují vždy s původním pořadím z JSON, takže revize u učitele i v přehledu výsledků vypadá stejně jako kvíz v editoru. Hned po odevzdání vidí student revizi v pořadí, ve kterém kvíz vyplňoval.

## Úprava otázek v aplikaci

V **👁 Náhledu kvízu** je záložka **✏️ Upravit otázky**. U každé otázky můžeš:

- **✏️ Upravit** – text, možnosti (přidat/odebrat), která je správná, vysvětlení i body,
- **Kopie** – vytvoří podobnou otázku, kterou jen přepíšeš,
- **↑ ↓** – posunout v pořadí (studentům se stejně zamíchá, pokud to máš zapnuté),
- **Smazat** – otázku odstraní (kvíz musí mít aspoň jednu).

Tlačítkem **+ Přidat otázku** vybereš typ (ABCD, více správných, pravda/nepravda, otevřená odpověď, párování) a rovnou ji vyplníš. Všechno se ukládá okamžitě do kvízu, takže se můžeš hned přepnout zpět na *Náhled* a zkusit si ho jako student.

> Pozor u kvízu, který už studenti vyplnili: změna možností nebo smazání otázky se projeví i v revizi starších pokusů (skóre u nich zůstává, jak bylo odevzdáno). Když měníš kvíz kvůli opravě, je čistší smazat pokusy a nechat studenty vyplnit znovu.

## Tři způsoby, jak založit kvíz

V detailu tématu máš tlačítka:

1. **✏️ Vytvořit ručně** – zadáš jen název (a případně popis) a hned se otevře editor, kde otázky přidáváš jednu po druhé. Kvíz je zatím **zavřený**, takže ho studenti nevidí; otevřeš ho v nastavení kvízu, až bude hotový.
2. **Nahrát HTML** – převede tvůj původní `.html` kvíz.
3. **+ Kvíz** – vložení celého kvízu jako JSON (např. vygenerovaného v Claudu).

Všechny tři končí ve stejném editoru, takže kvíz kdykoli doplníš nebo upravíš.
