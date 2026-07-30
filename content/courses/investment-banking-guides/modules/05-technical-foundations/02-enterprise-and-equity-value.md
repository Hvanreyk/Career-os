---
slug: enterprise-and-equity-value
title: "Enterprise value vs equity value (and multiples)"
est_minutes: 8
region: au
status: published
last_reviewed: "2026-07-07"
sources: []
---

The most common conceptual stumble in first interviews is mixing up enterprise and equity value. Get the house analogy into your head and the rest follows.

## The house analogy

A house is worth $1,000,000. The owner has a $600,000 mortgage. The **house's value** ($1m) is like **enterprise value (EV)** — what the whole asset is worth regardless of financing. The **owner's stake** ($400k) is like **equity value** — what's left after debt. Same house, two different questions.

Formally:

**Enterprise value = equity value + net debt** (net debt = debt − cash; add other claims like minority interests and preferred where relevant).

- **Equity value (market capitalisation for listed companies)** = share price × shares outstanding. What shareholders own.
- **Enterprise value** = the value of the operating business to *all* capital providers. What you'd effectively pay to own the business outright: buy the equity, inherit the debt, pocket the cash.

## Why the split matters: matching multiples

A valuation multiple must match the numerator's claim-holders to the denominator's:

- **EV multiples** pair with metrics *before* interest — **EV/EBITDA**, EV/EBIT, EV/Revenue — because EBITDA belongs to debt and equity holders together.
- **Equity multiples** pair with metrics *after* interest — **P/E** (price/earnings) — because net income belongs to shareholders alone.

Mixing them (EV/net income, price/EBITDA) is the error interviewers set traps for.

```knowledge_check
question: >-
  Company A and Company B have identical operations and EBITDA. A has no
  debt; B is heavily levered. Which multiple lets you compare their
  business valuations fairly?
options:
  - id: a
    text: P/E — earnings capture everything
  - id: b
    text: EV/EBITDA — it neutralises the different capital structures
  - id: c
    text: Share price alone
  - id: d
    text: Dividend yield
correctId: b
explanation: >-
  EV/EBITDA compares whole-business value to whole-business earnings,
  ignoring financing choices. P/E is distorted by B's interest expense and
  leverage. Capital-structure-neutral comparisons are the point of EV
  multiples.
```

## Worked mini-example

SharesCo: share price $5.00, 200m shares, debt $400m, cash $100m.

- Equity value = 5.00 × 200m = **$1,000m**
- Net debt = 400 − 100 = **$300m**
- Enterprise value = 1,000 + 300 = **$1,300m**
- EBITDA = $130m → **EV/EBITDA = 10.0x**; Net income = $70m → **P/E = 14.3x**

Now the classic follow-up: *"The company raises $100m of new debt and holds it as cash. What happens to EV?"* Nothing — debt +100 and cash +100 cancel in net debt. EV reflects the operating business, not financing shuffles. (Equity value is also unchanged; only gross debt and cash moved.)

```knowledge_check
question: A company uses $50m of its cash to repay $50m of debt. What happens to enterprise value?
options:
  - id: a
    text: Falls by $50m
  - id: b
    text: Rises by $50m
  - id: c
    text: Unchanged — cash and debt fall together, so net debt (and EV) is the same
  - id: d
    text: Doubles
correctId: c
explanation: >-
  Net debt = debt − cash: both sides drop $50m, netting to zero change.
  Financing rearrangements don't change what the operating business is
  worth — the heart of the EV concept.
```

```callout
variant: tip
title: The one-line test
md: >-
  If you can explain *why* a company's EV doesn't change when it raises
  cash or repays debt — because EV measures the operating asset, not the
  financing mix — you understand this topic at interview standard.
```
