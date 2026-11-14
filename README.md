# FinStack

A private, local-first dashboard for your net worth, budget, bank accounts, credit cards and emergency reserve. Plain HTML, CSS and JavaScript — no build step, no dependencies, no server.

## Run it locally

Double-click `index.html`, or serve the folder:

```bash
python -m http.server 8765
```

Then open <http://localhost:8765>.

## Load your data

1. Open the menu (top left) and choose **Import Excel**.
2. Pick your workbook (`.xlsx`).

The file is read inside the browser and saved to that browser's local storage. Nothing is uploaded. Each device keeps its own copy, so import the workbook once on your laptop and once on your phone. Re-import whenever the workbook changes.

All amounts start hidden. Tap the eye on a tile to reveal that number, or the eye in the top bar to reveal everything.

### Starting from the template

`assets/FinStack-template.xlsx` is a ready-made workbook in the layout FinStack reads (also linked from the Import dialog). Fill in the yellow cells, replacing the fictional example values, and leave the headings and formula cells as they are. Its first sheet, **Start here**, explains the rules.

### Sheets FinStack looks for

| Sheet name contains | What is read |
|---|---|
| `Budget` | Income rows, then the `NEEDS` / `WANTS` / `SAVINGS` / `INSURANCE` tables (Categories, Monthly, Yearly) and the target amounts above them |
| `Bank` | `ACCOUNT HOLDER`, `BANK NAME`, `BALANCE`, `MIN AC. BALANCE`, `Purpose` |
| `Invest` | The `Fund name` table, the `EMERGENCY FUND` table, the holdings summary (`Description` table) and `EMERGENCY SHIELD` |
| `Credit` | One `Card Name` table per person, under a title like `ALEX CREDIT CARD` |
| `Month` | The `Description` / `Amount` expense list, `Salary Credit`, `Misc`, both `Credit card bill` lists and `EMI SCHEDULE` |

Tables are found by their headings, so rows can be added or moved freely.

## Monthly Track

The **Monthly Track** page mirrors the `Monthly track` sheet and is editable in the app. Tap **Edit** to change amounts, add or remove rows, and step EMI instalments; totals update as you type and changes save automatically in that browser. **Start new month** moves this month's card bills to "last statement", clears them, and can count one more instalment on every running EMI.

Edits live in the browser, not in the Excel file. Re-importing the workbook replaces them.

## Fonts

Open the menu and choose **Change font** to switch fonts; the app updates as you tap, and the choice is remembered on that device.

To add another font, put the `.ttf`, `.otf` or `.woff2` file in `assets/fonts/` and add a line for it to the list at the top of `js/fonts.js`. Check each font's licence before committing it to a public repository.

## Put it on GitHub Pages (to open on your phone)

1. Create a repository on GitHub and push this folder to it.
2. In the repository: **Settings → Pages → Deploy from a branch → `main` / root**.
3. Open the Pages URL on your phone and import your workbook there. Use the browser's **Add to Home Screen** for an app-like icon.

The published site is public, but it contains only the app and fictional sample data. Your numbers never leave your devices. The `.gitignore` blocks `.xlsx` files so the workbook cannot be committed by accident.

## How the headline numbers are calculated

- **Bank Liquidity** — sum of all bank balances.
- **Portfolio Assets** — the holdings summary, minus the rows that make up the emergency fund (cash, FD, debt fund).
- **Emergency Reserve** — total of the `EMERGENCY FUND` table. Runway is that total divided by monthly essentials (needs plus insurance).
- **Total Net Worth** — bank balances plus all holdings, minus the reserve cash that is already inside the bank balances. Assets only; card dues and EMIs are not deducted.
