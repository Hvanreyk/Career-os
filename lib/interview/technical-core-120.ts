import { createHash } from 'node:crypto';
import { TECHNICAL_CONCEPT_BY_ID } from './taxonomy';
import type { Difficulty, TechnicalTopic, VariantType } from './types';

type QuestionAngle = {
  prompt: string;
  answer?: readonly [string, string, string];
  difficulty: Difficulty;
};

type ConceptDraft = {
  principles: readonly [string, string, string];
  angles: readonly QuestionAngle[];
};

type RawQuestionAngle = Omit<QuestionAngle, 'difficulty'>;
type RawConceptDraft = Omit<ConceptDraft, 'angles'> & { angles: readonly RawQuestionAngle[] };

export interface TechnicalCoreDraftFamily {
  id: string;
  slug: string;
  primaryConceptId: string;
  prerequisiteConceptIds: string[];
  topic: TechnicalTopic;
  difficulty: Difficulty;
  cognitiveOperation: 'explain' | 'apply' | 'defend';
  learningObjectives: string[];
  variantCoverage: VariantType[];
  questionVersion: {
    id: string;
    version: number;
    promptTemplate: string;
    followupPromptTemplates: string[];
    jurisdiction: 'AU' | 'GLOBAL_IFRS';
    currency: 'AUD' | 'NONE';
    calculatorPolicy: 'not_allowed' | 'mental_math';
    expectedAnswerDurationSeconds: { minimum: number; target: number; maximum: number };
    assumptions: Array<{ code: string; text: string; requiredToState: boolean }>;
    contentHash: string;
  };
  rubricVersion: {
    id: string;
    version: number;
    answerOutline: string[];
    mustHitPoints: Array<{
      code: string;
      description: string;
      weight: number;
      evidenceRules: Array<{ kind: 'semantic'; value: string; negated: false }>;
    }>;
    bonusPoints: Array<{ code: string; description: string; maximumContribution: number }>;
    fatalErrors: Array<{
      misconceptionCode: string;
      description: string;
      triggerRules: Array<{ kind: 'semantic'; value: string; negated: false }>;
      blocksMastery: true;
    }>;
    acceptedVariants: Array<{ condition: string; acceptedAnswer: string; rationale: string }>;
    commonMisconceptions: Array<{ misconceptionCode: string; explanation: string; remediationId: string }>;
    deterministicChecks: [];
    followupTree: Array<{
      nodeId: string;
      parentNodeId: null;
      trigger: 'correct' | 'partial';
      questionTemplate: string;
      expectedPoints: string[];
      maximumDepth: number;
    }>;
    contentHash: string;
  };
  parameterSpec: {
    id: string;
    version: number;
    seedVersion: number;
    parameters: [];
    derivedValues: [];
    constraints: [];
    transformationRules: Array<{ variant: VariantType; promptTemplate: string }>;
    contentHash: string;
  };
}

const c = (principles: ConceptDraft['principles'], ...angles: RawQuestionAngle[]): RawConceptDraft => ({ principles, angles });

// These are independently authored concept cards. The two supplied interview guides
// informed coverage only; none of their wording, sequencing, or answer prose is used.
const RAW_CONTENT: Record<string, RawConceptDraft> = {
  A01: c(
    ['The income statement measures performance over a period, the balance sheet shows resources and claims at a date, and the cash-flow statement reconciles the change in cash.', 'Net income links into retained earnings and starts the indirect cash-flow statement; ending cash from the cash-flow statement returns to the balance sheet.', 'A strong answer distinguishes period flows from point-in-time stocks and explains why profit, cash, and equity can move differently.'],
    { prompt: 'Give a concise map of the three primary financial statements and explain the job each one performs.' },
    { prompt: 'A profitable company reports lower cash and higher equity in the same year. Explain how that can be internally consistent across the three statements.' },
  ),
  A02: c(
    ['Begin with the transaction on the income statement, carry after-tax profit into retained earnings, and adjust cash through operating, investing, or financing activities.', 'Update the relevant assets, liabilities, and equity so that assets still equal liabilities plus equity.', 'Timing, non-cash items, and financing classification matter; never force the balance by inventing a cash movement.'],
    { prompt: 'Walk through a disciplined process for linking one operating transaction through all three financial statements.' },
    { prompt: 'A model balances only after cash is hard-coded. Diagnose the likely linkage failures and explain how you would repair them.' },
  ),
  A03: c(
    ['Accrual accounting recognises economic activity when earned or incurred, while cash accounting records settlement.', 'Receivables, payables, deferred revenue, and prepaid expenses bridge recognition and cash timing.', 'An earnings increase is not automatically a cash increase; working-capital movements reveal the timing difference.'],
    { prompt: 'Explain accrual accounting using one revenue example and one expense example.' },
    { prompt: 'Revenue rises faster than cash collections. What balance-sheet account should you inspect, and how does it affect operating cash flow?' },
  ),
  A04: c(
    ['Capital expenditure creates or improves a long-lived asset and is initially an investing cash outflow rather than an operating expense.', 'Depreciation reduces pre-tax income and the asset balance but is added back in operating cash flow because it is non-cash.', 'A disposal removes the asset and accumulated depreciation; only the gain or loss affects earnings, while total proceeds are investing cash flow.'],
    { prompt: 'Walk through the financial-statement effects of buying equipment and depreciating it over time.' },
    { prompt: 'A machine is sold above its carrying value. Explain the income-statement, cash-flow, and balance-sheet treatment without double counting the proceeds.' },
  ),
  A05: c(
    ['Operating working capital generally compares non-cash operating current assets with non-debt operating current liabilities.', 'An increase in an operating asset is usually a use of cash; an increase in an operating liability is usually a source of cash.', 'Interpret the movement economically: inventory builds, slower collections, or faster supplier payments can consume cash even when EBITDA grows.'],
    { prompt: 'Explain why an increase in net working capital usually reduces free cash flow.' },
    { prompt: 'Sales and EBITDA rise, but cash conversion deteriorates sharply. Identify the working-capital drivers you would test and their cash-flow signs.' },
  ),
  A06: c(
    ['Income-tax expense follows accounting profit and applicable tax rules, while cash tax reflects payments made in the period.', 'Deferred tax assets and liabilities record temporary differences between accounting and tax bases.', 'Valuation work should separate the tax rate applied to operating profit from timing items, permanent differences, and tax losses.'],
    { prompt: 'Distinguish current tax, cash tax, and deferred tax in an interview-ready answer.' },
    { prompt: 'A company records tax expense but pays little cash tax. Give defensible reasons and explain where the difference appears.' },
  ),
  A07: c(
    ['Share-based compensation is generally an operating expense even though current-period settlement is non-cash.', 'It is added back in cash flow but still transfers value to employees through dilution or future cash settlement.', 'Valuation must avoid calling the add-back free: diluted shares, option methods, and repurchase assumptions determine the equity impact.'],
    { prompt: 'Explain why share-based compensation is added back in the cash-flow statement but still matters to equity value.' },
    { prompt: 'Management excludes share-based compensation from adjusted EBITDA. How would you assess that adjustment and reflect dilution?' },
  ),
  A08: c(
    ['A lease commonly creates a right-of-use asset and lease liability at commencement.', 'Subsequent expense and cash-flow presentation depend on the accounting framework and lease classification, so assumptions must be stated.', 'In valuation, treat lease liabilities and lease-adjusted metrics consistently to avoid adding the obligation while also using an unadjusted denominator.'],
    { prompt: 'Describe the core balance-sheet and income-statement effects of a long-term lease under modern lease accounting.' },
    { prompt: 'You add lease liabilities to enterprise value. What must you check in EBITDA and peer-company data to avoid a mismatch?' },
  ),
  A09: c(
    ['In an acquisition, identifiable assets and liabilities are measured under purchase accounting and separable intangibles are recognised where required.', 'Goodwill is the residual after comparing consideration and relevant interests with the fair value of identifiable net assets.', 'Goodwill is not a plug for arbitrary optimism; valuation assumptions, deferred taxes, NCI, and prior interests can materially change it.'],
    { prompt: 'Explain how goodwill is created in an acquisition and why it is a residual rather than a directly valued asset.' },
    { prompt: 'Two deals have the same headline purchase price but different goodwill. Identify the purchase-accounting inputs that could explain the difference.' },
  ),
  A10: c(
    ['An impairment reduces the carrying value of an asset and records an expense, usually without a same-period cash outflow.', 'The charge lowers profit and equity; it is added back in the indirect cash-flow statement when non-cash.', 'The absence of immediate cash does not make it irrelevant: it may reveal weaker economics, change future depreciation, and affect covenants or credibility.'],
    { prompt: 'Walk through a non-cash impairment across the three financial statements.' },
    { prompt: 'Management calls a large restructuring charge non-recurring. What evidence would you require before normalising it?' },
  ),
  A11: c(
    ['A controlled subsidiary is consolidated, with non-controlling interests representing the portion not owned by the parent.', 'An associate is generally equity accounted: the investor records its share of profit and a single investment balance rather than consolidating every line.', 'Valuation numerators and denominators must use the same ownership scope; NCI and associate values are common bridge adjustments.'],
    { prompt: 'Compare consolidation, non-controlling interests, and equity accounting for associates.' },
    { prompt: 'A peer consolidates a 70%-owned subsidiary while another owns 30% of a similar business. How does that affect reported EBITDA and enterprise-value adjustments?' },
  ),
  A12: c(
    ['Earnings quality asks whether reported profit is repeatable, cash-backed, and measured using sustainable policies and assumptions.', 'Normalisation should remove genuinely non-recurring or non-operating items symmetrically and with evidence, not simply maximise adjusted EBITDA.', 'Cash conversion, working capital, capital intensity, customer concentration, and recurring adjustments are important cross-checks.'],
    { prompt: 'What makes reported earnings high quality, and which financial-statement signals would make you sceptical?' },
    { prompt: 'A company has stable adjusted EBITDA but weak operating cash flow and repeated add-backs. Explain how you would normalise performance.' },
  ),

  E01: c(
    ['Equity value belongs to ordinary shareholders; enterprise value represents the value of core operations available to all capital providers.', 'Equity-value multiples pair with post-interest metrics, while enterprise-value multiples pair with pre-interest operating metrics.', 'The distinction is about claim holders and metric consistency, not about enterprise value always being larger.'],
    { prompt: 'Distinguish equity value from enterprise value and give one appropriate multiple for each.' },
    { prompt: 'Can enterprise value be below equity value? Explain the bridge and the economic circumstances that make this possible.' },
  ),
  E02: c(
    ['Start with equity value, add debt and other financing claims, add relevant non-controlling interests, and subtract cash and other non-operating assets when appropriate.', 'The bridge converts the value attributable to common equity into the value of operations represented by the chosen operating metric.', 'Each adjustment must be classified from substance, not its balance-sheet label, and must match the denominator scope.'],
    { prompt: 'Walk from equity value to enterprise value and explain the sign of each major adjustment.' },
    { prompt: 'A candidate subtracts debt and adds cash when calculating enterprise value. Correct the logic using claim holders and sale proceeds.' },
  ),
  E03: c(
    ['Basic shares reflect ordinary shares outstanding, while diluted shares include incremental claims that are economically dilutive.', 'Options and similar instruments require an approved dilution method and consistent market-price assumptions; convertibles may require if-converted treatment.', 'Use period-average shares for EPS and point-in-time fully diluted shares for equity value unless the analysis requires otherwise.'],
    { prompt: 'Explain the difference between basic and fully diluted shares and when each is used.' },
    { prompt: 'A company has in-the-money options and convertible securities. Describe the tests needed to estimate dilution without double counting.' },
  ),
  E04: c(
    ['Debt-like items are financing claims or unavoidable obligations not captured in the operating metric; cash-like items are non-operating assets available to reduce the effective purchase cost.', 'Classification depends on control, accessibility, recurrence, and whether the related cost is above or below the denominator.', 'Common judgement areas include leases, pensions, provisions, restricted cash, investments, and deferred consideration.'],
    { prompt: 'How do you decide whether an item is debt-like or cash-like in an enterprise-value bridge?' },
    { prompt: 'Classify restricted cash, an underfunded pension, and a restructuring provision, stating what additional facts you need.' },
  ),
  E05: c(
    ['NCI is commonly added when consolidated operating results include earnings attributable to outside owners.', 'Lease liabilities and pensions require metric-consistent treatment, while associate investments are often subtracted if their earnings are excluded from consolidated EBITDA.', 'The objective is ownership-scope consistency, not a mechanical checklist.'],
    { prompt: 'Explain the treatment of NCI, lease liabilities, pensions, and associates in a sophisticated enterprise-value bridge.' },
    { prompt: 'Why can adding every disclosed liability to enterprise value produce a misleading result?' },
  ),
  E06: c(
    ['Operating assets and liabilities support core trading, while financing claims allocate value and risk among capital providers.', 'A negative enterprise value can arise when cash and investments exceed equity value plus financing claims.', 'It may signal distress, trapped or restricted cash, future cash burn, or misclassification; it is not automatically a free business.'],
    { prompt: 'Separate operating items from financing claims and explain why the distinction matters in valuation.' },
    { prompt: 'A listed company has negative enterprise value. Give plausible explanations and the diligence required before calling it undervalued.' },
  ),

  V01: c(
    ['Good comparable companies share economic drivers such as business model, end markets, geography, growth, margins, capital intensity, and risk.', 'Size and listing status matter, but industry labels alone do not create comparability.', 'Use a defensible peer set, identify imperfect matches, and explain how differences influence the selected multiple rather than hiding them.'],
    { prompt: 'How would you build and defend a comparable-company peer set?' },
    { prompt: 'Two companies sell similar products, but one is subscription-based and the other project-based. Should they trade at the same multiple?' },
    { prompt: 'Your best operational peer is much larger and more diversified than the target. Explain how you would still use it without creating false precision.' },
  ),
  V02: c(
    ['Precedent transactions reflect prices paid for control under specific market conditions and often include expected synergies.', 'They can be less comparable because timing, deal structure, target quality, and buyer motives differ.', 'A control premium is not a universal add-on; compare unaffected prices, standalone value, competition, and synergy sharing.'],
    { prompt: 'Compare precedent transactions with trading comparables and explain why precedent multiples may be higher.' },
    { prompt: 'Why is it unsafe to apply an average takeover premium mechanically to every target?' },
    { prompt: 'A precedent was signed in a cheap-credit boom and included a bidding war. How would you use or weight it today?' },
  ),
  V03: c(
    ['LTM captures the latest completed twelve months, while NTM reflects forecast performance over the next twelve months.', 'Calendarisation aligns companies with different fiscal year-ends to a common measurement period.', 'Valuation must use a multiple and financial metric from compatible dates, with transparent forecast and seasonality assumptions.'],
    { prompt: 'Distinguish LTM, NTM, and calendarised financials and explain why period alignment matters.' },
    { prompt: 'A June year-end target is compared with December year-end peers in March. Describe a defensible calendarisation approach.' },
    { prompt: 'When could an NTM multiple be less reliable than an LTM multiple even though it is more forward-looking?' },
  ),
  V04: c(
    ['Match enterprise value with pre-interest metrics and equity value with post-interest metrics.', 'Choose a denominator that reflects the sector economics and is sufficiently comparable across accounting policies and capital intensity.', 'No multiple is universally best; growth, margins, cyclicality, and metric quality determine interpretation.'],
    { prompt: 'Explain how you choose a valuation multiple and keep the numerator and denominator consistent.' },
    { prompt: 'Why might EV/Revenue be useful for one company but misleading for another in the same sector?' },
    { prompt: 'Defend or reject P/E as the primary multiple for a highly leveraged company with volatile tax rates.' },
  ),
  V05: c(
    ['Normalisation aims to estimate sustainable performance by adjusting for items that are genuinely non-recurring, non-operating, or measured inconsistently.', 'Adjustments require evidence and should be applied consistently to the target and peers, including associated tax and cash effects.', 'Recurring restructuring, share-based pay, and optimistic run-rate savings deserve particular scepticism.'],
    { prompt: 'What principles should govern normalising EBITDA for valuation?' },
    { prompt: 'Management proposes six add-backs. Describe how you would test whether each is legitimate and comparable with peers.' },
  ),
  V06: c(
    ['A valuation range reflects uncertainty in peers, forecasts, multiples, and methodology rather than a single precise truth.', 'Select ranges using evidence, show sensitivities, and reconcile differences among methods.', 'Do not average incompatible outputs mechanically; explain which assumptions drive the range and what evidence would move it.'],
    { prompt: 'How do you turn comparable-company outputs into a defensible implied valuation range?' },
    { prompt: 'Your DCF and trading comparables produce very different values. Explain how you would reconcile them without simply averaging.' },
  ),
  V07: c(
    ['A sum-of-the-parts values distinct businesses using methods and peer sets appropriate to each segment.', 'Corporate costs, inter-segment items, financing claims, and ownership interests must be allocated consistently.', 'Cross-check the result against consolidated trading metrics, market value, and strategic reality to detect double counting.'],
    { prompt: 'Walk through a sum-of-the-parts valuation and identify its main double-counting risks.' },
    { prompt: 'A conglomerate SOTP implies a large discount to market value. What checks would you perform before calling it an opportunity?' },
  ),

  F01: c(
    ['Unlevered free cash flow measures cash generated by operations before financing payments and is available to debt and equity holders.', 'A standard build starts with an unlevered operating profit measure, applies operating taxes, adds non-cash charges, subtracts capital expenditure, and subtracts increases in operating working capital.', 'Interest expense and debt repayments are excluded because they are financing flows reflected in WACC and the EV-to-equity bridge.'],
    { prompt: 'Build unlevered free cash flow from EBIT and explain every adjustment.' },
    { prompt: 'Why is interest expense excluded from unlevered free cash flow even though it is a real cash payment?' },
    { prompt: 'EBITDA grows while unlevered free cash flow falls. Give operational explanations and show where each enters the calculation.' },
  ),
  F02: c(
    ['WACC blends the required returns of capital providers using target or market-value capital weights.', 'Cost of equity reflects systematic risk, while the after-tax cost of debt reflects the tax deductibility assumption and credit risk.', 'Currency, inflation, capital structure, and the risk embedded in forecast cash flows must be consistent.'],
    { prompt: 'Explain the WACC formula conceptually and why market-value weights are normally used.' },
    { prompt: 'A candidate uses book-value debt and equity weights because they are audited. Explain why that may misprice the discount rate.' },
    { prompt: 'How would you adapt WACC for a company whose current leverage is temporarily far above its long-run target?' },
  ),
  F03: c(
    ['Asset beta reflects operating risk before leverage, while equity beta includes the amplification from financial leverage.', 'Unlever peer betas using each peer capital structure, take a central tendency, then relever to the target structure under stated tax assumptions.', 'Peer quality, cash, leases, cyclicality, and changing leverage can matter more than false precision in the formula.'],
    { prompt: 'Explain how and why you unlever and relever beta in a DCF.' },
    { prompt: 'A target has no reliable trading history. Describe how you would estimate beta from peers and where judgement enters.' },
  ),
  F04: c(
    ['Cost of debt should reflect the company’s current or target marginal borrowing cost, not simply historical coupon expense.', 'The tax shield applies only to the extent interest is deductible and usable.', 'Debt capacity, maturity, currency, security, and credit conditions should align with the forecast capital structure.'],
    { prompt: 'How would you estimate cost of debt and the tax shield for WACC?' },
    { prompt: 'A company’s old bonds have a low coupon but now trade at a high yield. Which measure belongs in WACC and why?' },
  ),
  F05: c(
    ['Perpetuity-growth terminal value capitalises a stable future cash flow at WACC minus a sustainable growth rate.', 'Exit-multiple terminal value applies a market multiple to a terminal operating metric and should be cross-checked against implied growth and returns.', 'Terminal assumptions must describe a mature, internally consistent business and should not dominate without sensitivity analysis.'],
    { prompt: 'Compare perpetuity-growth and exit-multiple terminal value methods, including their key consistency checks.' },
    { prompt: 'A terminal growth rate approaches WACC. Explain the mathematical and economic problem.' },
  ),
  F06: c(
    ['Cash flows must be discounted for the actual time between the valuation date and expected receipt.', 'Mid-year convention approximates cash generation throughout a period rather than only at year-end.', 'Stub periods, fiscal year-ends, and terminal-value timing must use the same convention to avoid hidden overvaluation.'],
    { prompt: 'Explain year-end versus mid-year discounting and when a stub period is required.' },
    { prompt: 'A DCF uses mid-year discounting for forecast cash flows but year-end timing for terminal value. Diagnose the inconsistency.' },
  ),
  F07: c(
    ['Higher discount rates generally lower present value, while higher sustainable growth or cash flow generally raises it, all else equal.', 'Sensitivities should vary economically linked assumptions and expose where the result is fragile.', 'Circularity can arise when financing assumptions influence valuation inputs; solve transparently or break it with a justified target structure.'],
    { prompt: 'Describe the directional sensitivities in a DCF and the assumptions you would stress first.' },
    { prompt: 'Your DCF value rises after WACC increases. List the modelling errors that could cause this result.' },
  ),

  M01: c(
    ['Strategic rationale should connect a transaction to capabilities, markets, customers, costs, or capital allocation rather than generic scale.', 'Revenue synergies are usually harder to evidence than cost synergies and require timing, investment, and dis-synergy assumptions.', 'A good recommendation separates strategic fit from price: a sensible asset can still be a poor acquisition at the wrong valuation.'],
    { prompt: 'How would you assess the strategic rationale for an acquisition beyond repeating management’s presentation?' },
    { prompt: 'Compare cost and revenue synergies and explain why their risk profiles differ.' },
    { prompt: 'A deal is strategically compelling but only value-creating under aggressive synergies. How would you advise the buyer?' },
  ),
  M02: c(
    ['Cash consideration uses existing liquidity or new funding, debt introduces interest and leverage, and scrip shares ownership and market risk with the seller.', 'Funding choice affects EPS, credit metrics, control, certainty, tax, and financial flexibility.', 'The cheapest headline source is not always best once dilution, refinancing, and downside risk are considered.'],
    { prompt: 'Compare cash, debt, and scrip as acquisition consideration from the buyer’s perspective.' },
    { prompt: 'Why can an all-share deal be EPS-accretive yet economically unattractive for the buyer’s existing shareholders?' },
    { prompt: 'A buyer can fund a deal with cash or debt at the same initial accounting cost. What strategic and risk factors decide the choice?' },
  ),
  M03: c(
    ['Offer price per share multiplied by fully diluted target shares gives equity purchase price, subject to treatment of options and other securities.', 'Transaction enterprise value adjusts equity purchase price for debt, cash, and other agreed debt-like or cash-like items.', 'Use unaffected share prices for premium analysis and distinguish headline consideration from total funding needs and fees.'],
    { prompt: 'Walk from offer price per share to equity purchase price and transaction enterprise value.' },
    { prompt: 'A deal announcement quotes three different transaction values. Explain why equity value, enterprise value, and total uses may differ.' },
  ),
  M04: c(
    ['Purchase accounting remeasures identifiable assets and liabilities and recognises eligible intangibles, deferred taxes, and relevant interests.', 'Goodwill is the residual between consideration and the fair value of acquired net assets under the applicable framework.', 'Step-ups affect future depreciation or amortisation and therefore post-deal earnings, taxes, and accretion.'],
    { prompt: 'Explain the purchase-accounting steps from announced consideration to new goodwill.' },
    { prompt: 'How can an asset write-up reduce near-term EPS even though it does not change the cash paid at closing?' },
  ),
  M05: c(
    ['Accretion or dilution compares pro forma EPS with the buyer’s standalone EPS using consistent periods and share counts.', 'Combine buyer and target earnings, remove lost interest income, add funding costs and amortisation, apply taxes, include synergies, and divide by pro forma diluted shares.', 'EPS accretion is an accounting result, not proof that the purchase price creates economic value.'],
    { prompt: 'Walk through the main components of an accretion/dilution analysis.' },
    { prompt: 'Explain how a deal can be EPS-accretive on day one but destroy value.' },
  ),
  M06: c(
    ['Breakeven analysis solves for the synergy, price, or funding variable that makes a selected outcome neutral.', 'The calculation must include financing cost, foregone interest, taxes, new shares, purchase-accounting charges, and timing.', 'Compare the breakeven with credible operating evidence rather than treating it as a forecast.'],
    { prompt: 'How would you calculate and interpret breakeven synergies in an acquisition?' },
    { prompt: 'A deal needs only modest cost synergies for EPS breakeven. What additional tests are required before recommending it?' },
  ),
  M07: c(
    ['An Australian public acquisition may proceed through a scheme of arrangement or takeover bid, each with different approval, court, timing, and control mechanics.', 'Analyse conditions, funding certainty, regulatory approvals, voting thresholds, competing proposals, and shareholder treatment.', 'Premium alone does not determine success; process risk and value certainty matter.'],
    { prompt: 'Compare an Australian scheme of arrangement with a takeover bid at a high level.' },
    { prompt: 'A bidder offers a high headline premium through scrip consideration. Identify the transaction and shareholder risks hidden by the premium.' },
  ),

  L01: c(
    ['Uses normally include equity purchase price, refinanced debt, fees, and required balance-sheet funding.', 'Sources include new debt, sponsor equity, rollover equity, and permitted target cash.', 'The schedule must balance, and each source should reflect realistic leverage, fees, minimum cash, and transaction mechanics.'],
    { prompt: 'Walk through the sources and uses schedule in an LBO and explain why every line belongs.' },
    { prompt: 'An LBO sources-and-uses schedule balances only after all target cash is used. What practical constraints may make it invalid?' },
  ),
  L02: c(
    ['Debt tranches differ by seniority, security, pricing, amortisation, maturity, covenants, and optional repayment.', 'A debt schedule rolls opening balance through draws, mandatory amortisation, optional paydown, PIK accrual, and closing balance.', 'Interest should use a defensible balance convention and respect circularity, cash availability, and tranche priority.'],
    { prompt: 'Explain how LBO debt tranches flow through a debt schedule.' },
    { prompt: 'Why does using only the closing debt balance to calculate annual cash interest distort an LBO model?' },
  ),
  L03: c(
    ['Cash available for debt repayment starts after operating needs, taxes, capital expenditure, interest, and minimum cash requirements.', 'Mandatory amortisation follows contractual terms; the cash sweep applies only residual eligible cash in the agreed priority.', 'Repayment lowers future interest and can create circularity, which must be solved consistently.'],
    { prompt: 'Walk through a cash sweep and distinguish it from mandatory debt amortisation.' },
    { prompt: 'An LBO repays more debt than the business generates in cash. Identify the schedule errors that may cause this.' },
  ),
  L04: c(
    ['MOIC is exit equity proceeds divided by invested equity and ignores time.', 'IRR is the annualised discount rate that equates dated cash outflows and inflows, so timing materially affects it.', 'Use both: MOIC shows total money made, while IRR captures speed and can be flattered by early distributions or short holds.'],
    { prompt: 'Compare MOIC and IRR and explain why sponsors track both.' },
    { prompt: 'Two investments have the same MOIC but different holding periods. Explain the IRR result and the limitation of relying on it alone.' },
  ),
  L05: c(
    ['Sponsor returns are driven by entry valuation, operating growth and margins, cash generation and deleveraging, exit valuation, and holding period.', 'Debt repayment transfers enterprise value to equity holders but must be earned through cash generation rather than assumed.', 'A strong attribution separates operating improvement from leverage and multiple expansion.'],
    { prompt: 'Identify and rank the principal value-creation drivers in an LBO.' },
    { prompt: 'An LBO earns a strong return despite flat EBITDA. Explain possible drivers and which ones are least repeatable.' },
  ),
  L06: c(
    ['Downside analysis should stress revenue, margins, working capital, capital expenditure, rates, covenant headroom, refinancing, and exit value.', 'Covenants and liquidity can cause failure before the base-case exit even if long-run enterprise value appears adequate.', 'Sponsor judgement should focus on survival, optionality, and credible mitigants rather than only a lower IRR.'],
    { prompt: 'Design a downside case for an LBO and explain the tests that matter before IRR.' },
    { prompt: 'The downside case still shows a positive equity return but breaches a covenant in year two. How should the investment committee interpret it?' },
  ),

  C01: c(
    ['Seniority sets contractual payment and insolvency priority, while security gives recourse to specified collateral; they are related but not identical.', 'Debt instruments differ by maturity, rate type, covenants, amortisation, call protection, and investor base.', 'Recovery depends on enterprise value, collateral, documentation, and structural position, not the label alone.'],
    { prompt: 'Distinguish seniority from security and compare common debt instruments used in leveraged finance.' },
    { prompt: 'Can unsecured debt rank senior to secured debt in any economically relevant sense? Explain structural and contractual priority.' },
  ),
  C02: c(
    ['For a fixed-rate bond, required yield and price generally move in opposite directions.', 'Yield reflects the risk-free curve, credit spread, maturity, optionality, liquidity, and expected cash flows.', 'Spread widening can reduce price even if benchmark rates are unchanged, while floating-rate instruments behave differently.'],
    { prompt: 'Explain the relationship among bond price, yield, benchmark rates, and credit spreads.' },
    { prompt: 'Rates fall but a company’s bond price also falls. Give a coherent credit-market explanation.' },
  ),
  C03: c(
    ['Leverage ratios compare debt or net debt with an earnings or cash-flow measure; coverage ratios compare available earnings or cash with interest or fixed charges.', 'Definitions are document-specific and may include caps, add-backs, leases, and netting rules.', 'Always reconcile the covenant definition before calculating headroom; a generic market ratio may not predict a breach.'],
    { prompt: 'Compare leverage and coverage ratios and explain how covenant definitions can change the result.' },
    { prompt: 'Management reports 3.0x net leverage, but the credit agreement shows 4.2x. Identify the definitional differences you would reconcile.' },
  ),
  C04: c(
    ['Debt capacity is the sustainable amount a business can service through cycles, while market availability is what lenders will provide at a point in time.', 'Assess cash-flow resilience, leverage, coverage, assets, covenants, maturity profile, and downside liquidity.', 'Refinancing risk arises when maturities, market access, or covenant pressure arrive before sufficient deleveraging.'],
    { prompt: 'How would you assess debt capacity and refinancing risk for a cyclical company?' },
  ),
  C05: c(
    ['A revolver is committed liquidity used for temporary funding needs, not a substitute for sustainable cash generation.', 'A model draws when cash falls below minimum requirements and repays when excess cash is available, subject to the limit.', 'Circularity, seasonal working capital, covenant access, and maturity determine whether apparent liquidity is real.'],
    { prompt: 'Explain how a revolver should operate in a cash-flow model and why it can create circularity.' },
  ),

  K01: c(
    ['Primary issuance creates new securities and sends proceeds to the issuer; secondary issuance transfers existing securities and sends proceeds to selling holders.', 'A transaction can contain both components, with different dilution, liquidity, and signalling effects.', 'Always identify who receives cash, whether share count changes, and how control shifts.'],
    { prompt: 'Distinguish primary from secondary issuance and explain who receives the proceeds.' },
    { prompt: 'An IPO raises A$500 million but the company receives only A$200 million before fees. Explain the likely offer structure.' },
  ),
  K02: c(
    ['An IPO combines valuation, primary and secondary sizing, underwriting, marketing, allocation, and listing mechanics.', 'Primary shares dilute existing ownership but bring cash onto the balance sheet; secondary shares do not fund the company.', 'Assess offer price, post-money equity value, free float, greenshoe mechanics, fees, lockups, and use of proceeds consistently.'],
    { prompt: 'Walk through the core mechanics of an IPO from valuation to post-offer share count.' },
    { prompt: 'How can an IPO dilute ownership but still increase value per existing share?' },
  ),
  K03: c(
    ['A placement raises capital from selected investors, a rights issue offers eligible holders participation rights, and a buyback returns capital by reducing shares.', 'The value impact depends on issue or repurchase price, use of proceeds, participation, franking or tax, and signalling.', 'Mechanical EPS accretion from a buyback does not prove value creation if shares are repurchased above intrinsic value.'],
    { prompt: 'Compare placements, rights issues, and buybacks from the perspective of an existing shareholder.' },
  ),
  K04: c(
    ['ECM and DCM feasibility depends on valuation, volatility, rates, spreads, liquidity, investor demand, comparable issuance, and issuer-specific risk.', 'Underwriting transfers defined placement risk for fees but does not eliminate market or diligence risk.', 'A recommendation should compare certainty, flexibility, cost, dilution, and execution windows rather than label markets simply open or closed.'],
    { prompt: 'How would you decide whether current conditions favour an equity issue, debt issue, or delayed financing?' },
  ),

  J01: c(
    ['An adjustment is credible when it is supported by source evidence, economically non-recurring or non-operating, and applied consistently across periods and peers.', 'Assess cash recurrence, management incentives, accounting policy changes, working-capital conversion, and disclosure quality.', 'When evidence is mixed, present reported and adjusted cases rather than silently selecting the more flattering number.'],
    { prompt: 'You receive management-adjusted EBITDA alongside statutory results. Explain how you would judge each adjustment.' },
    { prompt: 'An expense is labelled exceptional for the third consecutive year. Defend the treatment you would use in valuation.' },
  ),
  J02: c(
    ['Funding choice should reflect cost, maturity, flexibility, leverage, control, dilution, tax, market conditions, and downside resilience.', 'Compare the project or transaction return with the risk-adjusted cost and constraints of each capital source.', 'Preserving liquidity can be worth more than minimising the initial headline cost.'],
    { prompt: 'A company can fund growth with cash, debt, or equity. Build a decision framework rather than choosing the cheapest headline option.' },
    { prompt: 'Debt is currently cheaper than equity, but the company faces a large maturity in two years. Defend a funding recommendation.' },
  ),
  J03: c(
    ['Sector KPIs should connect directly to unit economics, growth durability, capital needs, and cash conversion.', 'Pair sector metrics with valuation measures that use compatible definitions and periods.', 'A fashionable KPI is not useful if it lacks comparability, can be manipulated, or does not reconcile to financial statements.'],
    { prompt: 'How would you select and validate sector-specific KPIs before using them in a valuation?' },
  ),
  J04: c(
    ['Transaction risk analysis should identify specific approval, funding, competition, integration, stakeholder, and market risks.', 'Rank risks by probability, impact, timing, detectability, and available mitigants.', 'Link each risk to deal terms, valuation, timetable, or financing rather than producing a generic checklist.'],
    { prompt: 'Given an announced Australian acquisition, how would you turn public disclosures into a prioritised transaction-risk assessment?' },
  ),
  J05: c(
    ['Start with audited statements and notes, reconcile management presentations to them, and use transaction documents for deal-specific facts.', 'Record reporting period, units, scope, page references, definitions, and later amendments before calculating.', 'Separate sourced facts, calculations, and judgement so another reviewer can reproduce the conclusion.'],
    { prompt: 'Describe a reliable process for answering an interview case using an annual report, investor presentation, and transaction announcement.' },
  ),
  J06: c(
    ['State the original assumption and the output it affects before changing it.', 'Propagate the change through linked operating, financing, valuation, and transaction consequences rather than changing one number in isolation.', 'Explain direction first, quantify where possible, and identify second-order effects or thresholds that could reverse the conclusion.'],
    { prompt: 'An interviewer reverses a key assumption after your answer. Show how you would defend or revise the conclusion without becoming inconsistent.' },
  ),
};

// Difficulty is assigned to each item deliberately. Topic allocations below
// validate this editorial choice; they never determine it by array position.
const ITEM_DIFFICULTIES: Record<string, readonly Difficulty[]> = {
  A01: ['foundation', 'interview_ready'], A02: ['foundation', 'interview_ready'],
  A03: ['foundation', 'interview_ready'], A04: ['foundation', 'interview_ready'],
  A05: ['foundation', 'interview_ready'], A06: ['foundation', 'interview_ready'],
  A07: ['foundation', 'interview_ready'], A08: ['foundation', 'interview_ready'],
  A09: ['interview_ready', 'advanced'], A10: ['interview_ready', 'advanced'],
  A11: ['interview_ready', 'advanced'], A12: ['advanced', 'advanced'],
  E01: ['foundation', 'interview_ready'], E02: ['foundation', 'foundation'],
  E03: ['foundation', 'interview_ready'], E04: ['interview_ready', 'interview_ready'],
  E05: ['interview_ready', 'advanced'], E06: ['advanced', 'advanced'],
  V01: ['foundation', 'interview_ready', 'interview_ready'],
  V02: ['foundation', 'interview_ready', 'interview_ready'],
  V03: ['foundation', 'interview_ready', 'interview_ready'],
  V04: ['foundation', 'interview_ready', 'advanced'],
  V05: ['foundation', 'interview_ready'], V06: ['interview_ready', 'advanced'],
  V07: ['advanced', 'advanced'],
  F01: ['foundation', 'foundation', 'interview_ready'],
  F02: ['foundation', 'interview_ready', 'interview_ready'],
  F03: ['foundation', 'interview_ready'], F04: ['interview_ready', 'interview_ready'],
  F05: ['interview_ready', 'advanced'], F06: ['interview_ready', 'advanced'],
  F07: ['advanced', 'advanced'],
  M01: ['interview_ready', 'foundation', 'advanced'],
  M02: ['foundation', 'interview_ready', 'advanced'],
  M03: ['foundation', 'interview_ready'], M04: ['foundation', 'interview_ready'],
  M05: ['interview_ready', 'interview_ready'], M06: ['interview_ready', 'advanced'],
  M07: ['interview_ready', 'advanced'],
  L01: ['foundation', 'interview_ready'], L02: ['foundation', 'interview_ready'],
  L03: ['interview_ready', 'advanced'], L04: ['foundation', 'interview_ready'],
  L05: ['interview_ready', 'advanced'], L06: ['interview_ready', 'advanced'],
  C01: ['foundation', 'interview_ready'], C02: ['foundation', 'interview_ready'],
  C03: ['interview_ready', 'advanced'], C04: ['advanced'], C05: ['interview_ready'],
  K01: ['foundation', 'interview_ready'], K02: ['foundation', 'interview_ready'],
  K03: ['interview_ready'], K04: ['advanced'],
  J01: ['interview_ready', 'advanced'], J02: ['interview_ready', 'advanced'],
  J03: ['interview_ready'], J04: ['advanced'], J05: ['advanced'], J06: ['advanced'],
};

const CONTENT: Record<string, ConceptDraft> = Object.fromEntries(
  Object.entries(RAW_CONTENT).map(([conceptId, draft]) => {
    const difficulties = ITEM_DIFFICULTIES[conceptId];
    if (!difficulties || difficulties.length !== draft.angles.length) {
      throw new Error(`${conceptId} requires one explicit difficulty per item`);
    }
    return [conceptId, {
      principles: draft.principles,
      angles: draft.angles.map((angle, index) => ({ ...angle, difficulty: difficulties[index]! })),
    } satisfies ConceptDraft];
  }),
);

const ALLOCATION: Record<TechnicalTopic, readonly [foundation: number, interviewReady: number, advanced: number]> = {
  accounting: [8, 11, 5],
  enterprise_value: [4, 5, 3],
  valuation: [5, 9, 4],
  dcf: [4, 8, 4],
  ma: [4, 8, 4],
  lbo: [3, 6, 3],
  debt_credit: [2, 4, 2],
  capital_markets: [2, 3, 1],
  applied_judgement: [0, 3, 5],
};

function stableUuid(value: string): string {
  const hash = createHash('sha256').update(`trajectoryos:technical-core-120:${value}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export const TECHNICAL_CORE_RESEARCH_SOURCES = [
  {
    id: stableUuid('source:wall-street-prep-interview-questions-2020'),
    sourceType: 'competitor_concept_research' as const,
    title: 'Investment Banking Interview Questions',
    publisher: 'Wall Street Prep',
    documentDate: '2020-01-01',
    jurisdiction: 'GLOBAL',
    rightsBasis: 'fact_reference_only' as const,
    notes: 'Coverage research only. All rights reserved; cannot support published wording or answer content.',
  },
  {
    id: stableUuid('source:biws-400-questions-2025'),
    sourceType: 'competitor_concept_research' as const,
    title: '400 Questions Guide for Investment Banking Interviews: 2025 Edition',
    publisher: 'Breaking Into Wall Street',
    documentDate: '2025-01-01',
    jurisdiction: 'GLOBAL',
    rightsBasis: 'fact_reference_only' as const,
    notes: 'Coverage research only. No wording, sequencing, or answer prose reproduced.',
  },
] as const;

export const TECHNICAL_CORE_RESEARCH_SECTIONS: Record<TechnicalTopic, readonly [string, string]> = {
  accounting: ['Accounting Questions (pp. 12–43)', 'Accounting – Concepts and Calculations (pp. 50–70)'],
  enterprise_value: ['Valuation Questions (pp. 44–71)', 'Equity Value & Enterprise Value (pp. 71–80)'],
  valuation: ['Valuation Questions (pp. 44–71)', 'Valuation Methodologies, Metrics and Multiples (pp. 81–93)'],
  dcf: ['Intrinsic Valuation (pp. 54–64)', 'Discounted Cash Flow (pp. 94–106)'],
  ma: ['Mergers & Acquisitions Questions (pp. 72–89)', 'Merger Models (pp. 107–118)'],
  lbo: ['Leveraged Buyout Questions (pp. 90–110)', 'LBO Models (pp. 119–128)'],
  debt_credit: ['Debt & Leveraged Finance (pp. 112–121)', 'DCM & Leveraged Finance (pp. 131–137)'],
  capital_markets: ['Capital Markets Questions (pp. 111–164)', 'ECM and DCM sections (pp. 131–149)'],
  applied_judgement: ['Industry Specific Questions (pp. 165–259)', 'Industry and Group-Specific Technical Questions (pp. 129–206)'],
};

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

const variants: VariantType[] = [
  'standard', 'reversed', 'numerical', 'assumption_changed', 'applied_company', 'explain_simply', 'followup_chain',
];

function transformedPrompts(prompt: string): TechnicalCoreDraftFamily['parameterSpec']['transformationRules'] {
  return [
    { variant: 'standard', promptTemplate: prompt },
    { variant: 'reversed', promptTemplate: `Start with the likely conclusion, then work backwards and test it: ${prompt}` },
    { variant: 'numerical', promptTemplate: `Use a small, internally consistent numerical example to support your reasoning: ${prompt}` },
    { variant: 'assumption_changed', promptTemplate: `Answer this, then reverse one material assumption and explain what changes: ${prompt}` },
    { variant: 'applied_company', promptTemplate: `Apply the analysis to a hypothetical ASX-listed company and state any additional facts required: ${prompt}` },
    { variant: 'explain_simply', promptTemplate: `Explain this to a new analyst without using unexplained jargon: ${prompt}` },
    { variant: 'followup_chain', promptTemplate: `${prompt} Then answer the most likely technical follow-up an associate would ask.` },
  ];
}

function buildFamilies(): TechnicalCoreDraftFamily[] {
  const byTopic = new Map<TechnicalTopic, Array<{ conceptId: string; angle: QuestionAngle; index: number }>>();
  for (const [conceptId, draft] of Object.entries(CONTENT)) {
    const concept = TECHNICAL_CONCEPT_BY_ID.get(conceptId);
    if (!concept) throw new Error(`Unknown draft concept ${conceptId}`);
    const topicRows = byTopic.get(concept.topic) ?? [];
    draft.angles.forEach((angle, index) => topicRows.push({ conceptId, angle, index }));
    byTopic.set(concept.topic, topicRows);
  }

  return [...byTopic.entries()].flatMap(([topic, rows]) => {
    const expectedCount = ALLOCATION[topic].reduce((total, count) => total + count, 0);
    if (expectedCount !== rows.length) {
      throw new Error(`${topic} has ${rows.length} draft questions but allocation requires ${expectedCount}`);
    }
    return rows.map(({ conceptId, angle, index }) => {
      const concept = TECHNICAL_CONCEPT_BY_ID.get(conceptId)!;
      const difficulty = angle.difficulty;
      const answerOutline = [...(angle.answer ?? CONTENT[conceptId]!.principles)];
      const slug = `${conceptId.toLowerCase()}-${String(index + 1).padStart(2, '0')}-${concept.slug.replace(`${conceptId.toLowerCase()}-`, '')}`;
      const familyId = stableUuid(`family:${slug}`);
      const question = {
        version: 1,
        promptTemplate: angle.prompt,
        followupPromptTemplates: [
          `Which assumption in your answer is most fragile, and how would changing it affect the conclusion?`,
          `What common candidate error would produce the opposite answer?`,
        ],
        jurisdiction: topic === 'ma' || topic === 'capital_markets' || topic === 'applied_judgement' ? 'AU' as const : 'GLOBAL_IFRS' as const,
        currency: topic === 'ma' || topic === 'capital_markets' || topic === 'applied_judgement' ? 'AUD' as const : 'NONE' as const,
        calculatorPolicy: 'not_allowed' as const,
        expectedAnswerDurationSeconds: difficulty === 'foundation'
          ? { minimum: 30, target: 75, maximum: 150 }
          : { minimum: 45, target: 120, maximum: 210 },
        assumptions: [{ code: 'SCOPE', text: 'State any accounting, jurisdictional, or transaction assumption that changes the treatment.', requiredToState: difficulty === 'advanced' }],
      };
      const misconception = concept.primaryMisconceptionCode;
      const rubricWithoutHash = {
        version: 1,
        answerOutline,
        mustHitPoints: answerOutline.map((description, pointIndex) => ({
          code: `POINT_${pointIndex + 1}`,
          description,
          weight: [0.4, 0.35, 0.25][pointIndex]!,
          evidenceRules: [{ kind: 'semantic' as const, value: description, negated: false as const }],
        })),
        bonusPoints: [{ code: 'JUDGEMENT', description: 'States a relevant caveat or asks for missing facts without avoiding the question.', maximumContribution: 0.1 }],
        fatalErrors: [{
          misconceptionCode: misconception,
          description: `Applies the primary ${concept.name.toLowerCase()} misconception in a way that reverses the conclusion.`,
          triggerRules: [{ kind: 'semantic' as const, value: `Evidence of ${misconception}`, negated: false as const }],
          blocksMastery: true as const,
        }],
        acceptedVariants: [{
          condition: 'The candidate states a different but defensible accounting or transaction assumption.',
          acceptedAnswer: 'Accept the alternative treatment when it is internally consistent and the candidate explains its effect.',
          rationale: 'Interview answers should reward explicit, defensible assumptions rather than one hidden convention.',
        }],
        commonMisconceptions: [{
          misconceptionCode: misconception,
          explanation: `The candidate confuses or omits a core relationship in ${concept.name.toLowerCase()}.`,
          remediationId: `${misconception}.remediation`,
        }],
        deterministicChecks: [] as [],
        followupTree: [
          { nodeId: 'CORRECT_STRESS', parentNodeId: null, trigger: 'correct' as const, questionTemplate: 'Change the most important assumption and defend the new direction of the answer.', expectedPoints: [answerOutline[2]!], maximumDepth: 2 },
          { nodeId: 'PARTIAL_FOUNDATION', parentNodeId: null, trigger: 'partial' as const, questionTemplate: 'Explain the underlying relationship in plain language before returning to the original question.', expectedPoints: [answerOutline[0]!], maximumDepth: 2 },
        ],
      };
      const parameterWithoutHash = {
        version: 1,
        seedVersion: 1,
        parameters: [] as [],
        derivedValues: [] as [],
        constraints: [] as [],
        transformationRules: transformedPrompts(angle.prompt),
      };
      return {
        id: familyId,
        slug,
        primaryConceptId: conceptId,
        prerequisiteConceptIds: [...concept.prerequisiteIds],
        topic,
        difficulty,
        cognitiveOperation: difficulty === 'foundation' ? 'explain' : difficulty === 'interview_ready' ? 'apply' : 'defend',
        learningObjectives: [`Explain ${concept.name.toLowerCase()} accurately`, `Avoid ${misconception}`, 'Defend the answer when an interviewer changes an assumption'],
        variantCoverage: [...variants],
        questionVersion: { id: stableUuid(`question:${slug}:1`), ...question, contentHash: hash(question) },
        rubricVersion: { id: stableUuid(`rubric:${slug}:1`), ...rubricWithoutHash, contentHash: hash(rubricWithoutHash) },
        parameterSpec: { id: stableUuid(`parameters:${slug}:1`), ...parameterWithoutHash, contentHash: hash(parameterWithoutHash) },
      };
    });
  });
}

export const TECHNICAL_CORE_120_DRAFTS = buildFamilies();

export function validateTechnicalCore120Drafts(): string[] {
  const errors: string[] = [];
  if (TECHNICAL_CORE_120_DRAFTS.length !== 120) errors.push(`Expected 120 draft families, found ${TECHNICAL_CORE_120_DRAFTS.length}.`);
  const slugs = new Set<string>();
  for (const family of TECHNICAL_CORE_120_DRAFTS) {
    if (slugs.has(family.slug)) errors.push(`Duplicate family slug ${family.slug}.`);
    slugs.add(family.slug);
    if (family.variantCoverage.length !== variants.length) errors.push(`${family.slug} is missing anti-memorisation variants.`);
    if (family.rubricVersion.answerOutline.length !== 3) errors.push(`${family.slug} must have three answer-outline points.`);
    const weight = family.rubricVersion.mustHitPoints.reduce((sum, point) => sum + point.weight, 0);
    if (Math.abs(weight - 1) > 1e-9) errors.push(`${family.slug} rubric weights do not sum to 1.`);
  }
  for (const [topic, [foundation, interviewReady, advanced]] of Object.entries(ALLOCATION)) {
    const rows = TECHNICAL_CORE_120_DRAFTS.filter((family) => family.topic === topic);
    const actual = [
      rows.filter((family) => family.difficulty === 'foundation').length,
      rows.filter((family) => family.difficulty === 'interview_ready').length,
      rows.filter((family) => family.difficulty === 'advanced').length,
    ];
    const expected = [foundation, interviewReady, advanced];
    if (actual.some((value, index) => value !== expected[index])) errors.push(`${topic} allocation is ${actual.join('/')}, expected ${expected.join('/')}.`);
  }
  const covered = new Set(TECHNICAL_CORE_120_DRAFTS.map((family) => family.primaryConceptId));
  for (const conceptId of CONTENT ? TECHNICAL_CONCEPT_BY_ID.keys() : []) {
    if (!covered.has(conceptId)) errors.push(`Concept ${conceptId} has no draft family.`);
  }
  return errors;
}
