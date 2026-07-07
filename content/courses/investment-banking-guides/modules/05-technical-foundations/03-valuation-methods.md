---
slug: valuation-methods
title: "Valuation: DCF, comps, precedents (and why rates matter)"
est_minutes: 9
region: au
status: published
last_reviewed: "2026-07-07"
sources: []
---

Bankers triangulate value with three main methods, then layer deal-specific analyses (accretion/dilution, LBO) on top. You need each method's logic, inputs and failure modes — depth comes later in the Interview Preparation course.

## Comparable companies ("trading comps")

*Logic:* similar listed companies should trade on similar multiples. Pick a peer set, spread their EV/EBITDA (or P/E, or sector-specific multiples), apply the range to your company's metrics.

*Strengths:* market-based, current, fast. *Weaknesses:* no company is truly comparable; the whole market can be mispriced; thin peer sets (common in Australia's smaller market) force offshore comparisons with their own distortions.

## Precedent transactions ("deal comps")

*Logic:* what did acquirers actually pay for similar businesses? Same mechanics as trading comps but using M&A deal multiples — which are typically *higher*, because acquirers pay a **control premium** (the right to run the business and capture synergies).

*Strengths:* evidence of real prices paid for control. *Weaknesses:* deals are infrequent and dated; each carried unique circumstances (synergies, competitive tension, cycle timing) baked invisibly into the multiple.

## Discounted cash flow (DCF)

*Logic:* a business is worth the present value of the cash it will generate. Forecast **unlevered free cash flows** for 5–10 years, add a **terminal value** for everything beyond, and discount it all back at the **WACC** (weighted average cost of capital — the blended return debt and equity investors demand).

*Strengths:* intrinsic — grounded in the business's own economics, forces explicit assumptions. *Weaknesses:* garbage in, garbage out; small changes in WACC or terminal growth swing the answer hugely; terminal value often dominates the total.

```table
caption: The three methods side by side
headers:
  - Method
  - Question it answers
  - Key inputs
  - Main weakness
rows:
  - - Trading comps
    - What do similar companies trade at?
    - Peer set, current multiples
    - No perfect peers; market can misprice
  - - Precedent transactions
    - What have buyers paid for control?
    - Deal multiples, premiums
    - Stale, situation-specific
  - - DCF
    - What are the future cash flows worth?
    - Forecasts, WACC, terminal value
    - Assumption-sensitive
```

Why run all three? Each fails differently. A banker presents them as a "football field" — overlapping ranges — and a defensible valuation sits where the methods agree. When asked *"which gives the highest value?"*, the classic answer is precedent transactions (control premium), but say "typically" — it depends on the market moment.

```knowledge_check
question: Why do precedent-transaction multiples usually exceed trading-comp multiples?
options:
  - id: a
    text: Deal databases inflate numbers
  - id: b
    text: Acquirers pay a control premium — for the right to run the business and capture synergies
  - id: c
    text: Precedent transactions use different accounting
  - id: d
    text: They don't — trading comps are always higher
correctId: b
explanation: >-
  Buying control is worth more than holding a passive minority stake:
  the buyer can change strategy, cut costs and realise synergies. That
  premium sits inside every deal multiple.
```

## The deal overlays

**Accretion/dilution.** For an acquirer using shares or debt: does the deal increase (accrete) or decrease (dilute) earnings per share? A first-order screen boards always ask about — though accretion is not the same as value creation.

**LBO analysis.** As a valuation tool: "what could a PE firm afford to pay and still hit its target return?" — this often sets a **floor** on price in sale processes where sponsors are bidding.

## Why interest rates move all of it

Rates thread through every method: a higher risk-free rate raises WACC, which shrinks DCF values (especially the far-future terminal value — this is why rate rises hit growth companies hardest). Costlier debt cuts LBO affordability. Equity multiples compress as bond yields compete for capital. When you hear "higher rates pressure valuations", this is the machinery underneath — and it's a favourite interview thread: *rates → discount rates → valuations → deal activity*.

```knowledge_check
question: Central bank rate rises flow through to LOWER company valuations mainly because…
options:
  - id: a
    text: Companies must legally cut their prices
  - id: b
    text: Discount rates (WACC) rise so future cash flows are worth less today, and costlier debt cuts what buyers can pay
  - id: c
    text: Accountants change depreciation schedules
  - id: d
    text: Rates only affect banks, not valuations
correctId: b
explanation: >-
  Valuation is future cash discounted to today: raise the discount rate
  and present values fall — most sharply for distant cash flows. Add
  reduced debt capacity for leveraged buyers and the whole price structure
  of the market steps down.
```
