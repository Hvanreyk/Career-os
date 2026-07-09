---
slug: the-three-statements
title: "The three financial statements (and how they link)"
est_minutes: 9
region: au
status: published
last_reviewed: "2026-07-07"
sources: []
---

Every technical interview starts here. You need the three statements cold — not as accounting trivia, but as one connected system describing a business.

## What each statement answers

**Income statement (P&L).** *Did the business make an accounting profit this period?* Revenue, minus operating costs, gives **EBITDA** (earnings before interest, tax, depreciation and amortisation — the profitability measure bankers quote constantly); minus depreciation & amortisation gives EBIT; minus interest and tax gives **net income**. Accrual-based: revenue is recognised when earned, not when cash arrives.

**Balance sheet.** *What does the business own and owe right now?* Assets = Liabilities + Equity, always. A snapshot at a date, not a period. Cash, receivables, inventory, PP&E on one side; debt, payables and shareholders' equity on the other.

**Cash flow statement.** *Where did cash actually move?* Starts from net income, adds back non-cash items (like depreciation), adjusts for working-capital movements, then shows investing (capex, acquisitions) and financing (debt, dividends, buybacks) flows. It reconciles opening to closing cash — and it's where accrual accounting meets reality.

```callout
variant: tip
title: Why bankers obsess over EBITDA and cash
md: >-
  EBITDA approximates operating cash generation before financing and tax
  choices, so it's comparable across companies — which is why valuation
  multiples and debt capacity are quoted off it. But profit is an opinion;
  cash is a fact. Companies die from running out of cash, not from
  accounting losses.
```

## The linkages — the classic interview question

"**Walk me through what happens when depreciation increases by $10**" (assume 30% tax):

1. **Income statement:** depreciation +10 → pre-tax profit −10 → tax −3 → **net income −7**.
2. **Cash flow statement:** start at net income −7, add back the non-cash depreciation +10 → **cash +3**.
3. **Balance sheet:** cash +3; PP&E −10 (more accumulated depreciation) → assets −7. Retained earnings −7 via net income → equity −7. **Balanced.**

The counterintuitive punchline — higher depreciation *increases* cash (through the tax shield) — is exactly why interviewers love the question. Learn the three-step pattern: P&L effect → cash effect (add back non-cash, tax-adjusted) → both sides of the balance sheet.

```knowledge_check
question: Depreciation rises by $10 (tax rate 30%). What happens to cash?
options:
  - id: a
    text: Falls by $10
  - id: b
    text: Rises by $3 — net income falls $7 but the $10 non-cash charge is added back
  - id: c
    text: No change — depreciation is non-cash
  - id: d
    text: Falls by $7
correctId: b
explanation: >-
  Depreciation itself moves no cash, but it reduces taxable profit, saving
  $3 of real tax. Net income −7 plus the +10 add-back = +3 cash. The
  balance sheet ties out with PP&E −10 and equity −7.
```

## Working capital — the silent cash killer

**Net working capital** (receivables + inventory − payables, roughly) is cash trapped in the operating cycle. A growing business *consumes* cash as receivables and inventory grow ahead of collections — profitable companies can strangle themselves this way. Deal relevance is everywhere: working-capital adjustments in M&A completion mechanics, seasonal debt facilities, and the "why did cash fall while profit rose?" question.

```knowledge_check
question: A retailer's revenue grows 40% and it stuffs warehouses with inventory for the holidays, paying suppliers upfront. Profit is up. Why might cash be down?
options:
  - id: a
    text: Impossible — profit and cash always move together
  - id: b
    text: Working capital absorbed it — cash is sitting in inventory and receivables before customers pay
  - id: c
    text: The accountant made an error
  - id: d
    text: Depreciation increased
correctId: b
explanation: >-
  Accrual profit recognises sales when earned; the cash-flow statement
  reveals cash locked into inventory and receivables. Growth consumes
  working capital — a core reason the cash flow statement exists.
```
