import type { TechnicalConcept, TechnicalTopic } from './types';

type ConceptRow = readonly [id: string, name: string, prerequisites: string, misconception: string];

const TOPIC_ROWS: ReadonlyArray<readonly [TechnicalTopic, readonly ConceptRow[]]> = [
  ['accounting', [
    ['A01', 'Purpose and structure of the three statements', '', 'A01.STOCK_FLOW_CONFUSION'],
    ['A02', 'Three-statement linkages and balancing', 'A01', 'A02.BROKEN_LINKAGE'],
    ['A03', 'Accrual accounting and cash timing', 'A01', 'A03.EARNINGS_EQUALS_CASH'],
    ['A04', 'Capex, depreciation and disposals', 'A02,A03', 'A04.NONCASH_TAX_EFFECT_OMITTED'],
    ['A05', 'Working capital and cash conversion', 'A02,A03', 'A05.WC_SIGN_REVERSAL'],
    ['A06', 'Current tax, cash tax and deferred tax', 'A02,A03', 'A06.TAX_EXPENSE_EQUALS_CASH_TAX'],
    ['A07', 'Share-based compensation and dilution', 'A02', 'A07.SBC_DILUTION_OMITTED'],
    ['A08', 'Lease accounting and lease liabilities', 'A02', 'A08.LEASE_DOUBLE_COUNT'],
    ['A09', 'Goodwill and identifiable intangibles', 'A02', 'A09.GOODWILL_MECHANICS_ERROR'],
    ['A10', 'Impairments, write-downs and restructuring', 'A02,A09', 'A10.IMPAIRMENT_CASH_EFFECT'],
    ['A11', 'NCI, associates and equity-accounted investments', 'A02', 'A11.CONSOLIDATION_SCOPE_ERROR'],
    ['A12', 'Cash-flow quality and earnings normalisation', 'A02,A05', 'A12.EBITDA_EQUALS_CASH_FLOW'],
  ]],
  ['enterprise_value', [
    ['E01', 'Equity value versus enterprise value', 'A01', 'E01.VALUE_HOLDER_CONFUSION'],
    ['E02', 'Basic EV-to-equity bridge', 'E01', 'E02.BRIDGE_SIGN_ERROR'],
    ['E03', 'Basic and diluted shares outstanding', 'E01,A07', 'E03.DILUTION_METHOD_ERROR'],
    ['E04', 'Debt-like and cash-like items', 'E02', 'E04.CLASSIFICATION_ERROR'],
    ['E05', 'NCI, leases, pensions and associates in EV', 'E02,A08,A11', 'E05.ADVANCED_BRIDGE_OMISSION'],
    ['E06', 'Operating versus financing claims and negative EV', 'E02,E04', 'E06.NEGATIVE_EV_MISINTERPRETATION'],
  ]],
  ['valuation', [
    ['V01', 'Comparable-company selection', 'E01,E02,A12', 'V01.BAD_PEER_SET'],
    ['V02', 'Precedent transactions and control premiums', 'V01,E02', 'V02.PRECEDENT_PREMIUM_CONFUSION'],
    ['V03', 'LTM, NTM and calendarisation', 'A01', 'V03.PERIOD_MISMATCH'],
    ['V04', 'Selecting valuation multiples', 'E01,E02,V03', 'V04.NUMERATOR_DENOMINATOR_MISMATCH'],
    ['V05', 'Normalising financials', 'A12,V03', 'V05.NONRECURRING_ADJUSTMENT_ERROR'],
    ['V06', 'Implied valuation ranges and sensitivities', 'V01,V02,V04', 'V06.FALSE_PRECISION'],
    ['V07', 'Sum-of-the-parts and valuation cross-checks', 'V01,V04,V06', 'V07.SOTP_DOUBLE_COUNT'],
  ]],
  ['dcf', [
    ['F01', 'Unlevered free cash flow', 'A04,A05,A06,A12', 'F01.INTEREST_IN_UFCF'],
    ['F02', 'WACC framework', 'E01,E02,A06', 'F02.BOOK_VALUE_WEIGHTS'],
    ['F03', 'Beta, levering and relevering', 'F02', 'F03.BETA_LEVERING_ERROR'],
    ['F04', 'Cost of debt, tax shield and target capital structure', 'F02,A06', 'F04.TAX_SHIELD_ERROR'],
    ['F05', 'Perpetuity-growth and exit-multiple terminal value', 'F01,F02', 'F05.TERMINAL_VALUE_INCONSISTENCY'],
    ['F06', 'Discount periods and mid-year convention', 'F01,F02', 'F06.DISCOUNT_PERIOD_ERROR'],
    ['F07', 'DCF sensitivity, circularity and judgement', 'F05,F06', 'F07.DIRECTIONAL_SENSITIVITY_ERROR'],
  ]],
  ['ma', [
    ['M01', 'Strategic rationale and synergy categories', 'V01,V02', 'M01.UNSUPPORTED_SYNERGY'],
    ['M02', 'Cash, debt and scrip consideration', 'E02,F02', 'M02.FUNDING_COST_OMITTED'],
    ['M03', 'Offer price, equity purchase price and transaction EV', 'E02,V02', 'M03.PURCHASE_PRICE_BRIDGE_ERROR'],
    ['M04', 'Purchase accounting and goodwill creation', 'A09,M03', 'M04.GOODWILL_CALCULATION_ERROR'],
    ['M05', 'Accretion and dilution', 'A02,M02,M04', 'M05.ACCRETION_EQUALS_VALUE_CREATION'],
    ['M06', 'Synergy, financing and breakeven analysis', 'M02,M05,F04', 'M06.BREAKEVEN_LOGIC_ERROR'],
    ['M07', 'Takeovers, schemes, premiums and transaction mechanics', 'M01,M03', 'M07.AU_DEAL_MECHANICS_ERROR'],
  ]],
  ['lbo', [
    ['L01', 'Sources and uses', 'E02,V01', 'L01.SOURCES_USES_IMBALANCE'],
    ['L02', 'Debt tranches and debt schedules', 'L01,C01', 'L02.DEBT_SCHEDULE_ERROR'],
    ['L03', 'Interest, mandatory amortisation and cash sweep', 'L02,F01', 'L03.CASH_SWEEP_ERROR'],
    ['L04', 'MOIC and IRR', 'L01,L02', 'L04.IRR_MOIC_CONFUSION'],
    ['L05', 'Leverage, deleveraging and value-creation drivers', 'L03,L04', 'L05.VALUE_DRIVER_MISATTRIBUTION'],
    ['L06', 'Downside cases, covenants and sponsor judgement', 'L02,C03', 'L06.DOWNSIDE_OMISSION'],
  ]],
  ['debt_credit', [
    ['C01', 'Debt instruments, seniority and security', 'E02', 'C01.SENIORITY_EQUALS_SECURITY'],
    ['C02', 'Yield, price, rates and credit spreads', 'C01', 'C02.YIELD_PRICE_DIRECTION_ERROR'],
    ['C03', 'Leverage, coverage and covenant calculations', 'C01,A12', 'C03.COVENANT_METRIC_ERROR'],
    ['C04', 'Debt capacity and refinancing risk', 'C02,C03,F01', 'C04.CAPACITY_EQUALS_AVAILABILITY'],
    ['C05', 'Revolvers, liquidity and working-capital funding', 'C01,A05', 'C05.REVOLVER_CIRCULARITY'],
  ]],
  ['capital_markets', [
    ['K01', 'Primary versus secondary issuance', 'E01,E02', 'K01.PROCEEDS_RECIPIENT_ERROR'],
    ['K02', 'IPO mechanics, valuation and dilution', 'K01,E03,V06', 'K02.IPO_DILUTION_ERROR'],
    ['K03', 'Placements, rights issues and buybacks', 'K01,E03', 'K03.SHARE_COUNT_EFFECT_ERROR'],
    ['K04', 'ECM/DCM conditions and underwriting', 'C02,K01', 'K04.MARKET_CONDITION_OVERSIMPLIFICATION'],
  ]],
  ['applied_judgement', [
    ['J01', 'Earnings quality and adjustment judgement', 'A12,V05', 'J01.ADJUSTMENT_WITHOUT_EVIDENCE'],
    ['J02', 'Capital allocation and funding choice', 'F02,C04,K01,M02', 'J02.FUNDING_TRADEOFF_OMITTED'],
    ['J03', 'Sector-specific KPIs and valuation', 'V04,V07', 'J03.SECTOR_METRIC_MISMATCH'],
    ['J04', 'Transaction, regulatory and shareholder risks', 'M07,C03,K04', 'J04.RISK_ANALYSIS_TOO_GENERIC'],
    ['J05', 'Public-company document synthesis', 'V07,J01,M03', 'J05.SOURCE_SYNTHESIS_ERROR'],
    ['J06', 'Defending an answer under changed assumptions', 'F07,M06,L06,J05', 'J06.ASSUMPTION_CHANGE_NOT_PROPAGATED'],
  ]],
];

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const TECHNICAL_CONCEPTS: readonly TechnicalConcept[] = TOPIC_ROWS.flatMap(([topic, rows]) =>
  rows.map(([id, name, prerequisites, primaryMisconceptionCode], index) => ({
    id,
    name,
    slug: `${id.toLowerCase()}-${slugify(name)}`,
    topic,
    prerequisiteIds: prerequisites ? prerequisites.split(',') : [],
    primaryMisconceptionCode,
    sortOrder: index + 1,
  })),
);

export const TECHNICAL_CONCEPT_BY_ID = new Map(TECHNICAL_CONCEPTS.map((concept) => [concept.id, concept]));

export function validateConceptTaxonomy(concepts: readonly TechnicalConcept[] = TECHNICAL_CONCEPTS): string[] {
  const errors: string[] = [];
  const byId = new Map(concepts.map((concept) => [concept.id, concept]));
  if (byId.size !== concepts.length) errors.push('Concept IDs must be unique.');
  for (const concept of concepts) {
    if (!concept.primaryMisconceptionCode.startsWith(`${concept.id}.`)) {
      errors.push(`${concept.id} primary misconception must be owned by the concept.`);
    }
    for (const prerequisite of concept.prerequisiteIds) {
      if (!byId.has(prerequisite)) errors.push(`${concept.id} references missing prerequisite ${prerequisite}.`);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(id: string, path: string[]) {
    if (visiting.has(id)) { errors.push(`Prerequisite cycle: ${[...path, id].join(' -> ')}`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const prerequisite of byId.get(id)?.prerequisiteIds ?? []) visit(prerequisite, [...path, id]);
    visiting.delete(id);
    visited.add(id);
  }
  for (const concept of concepts) visit(concept.id, []);
  return errors;
}

export const TECHNICAL_CORE_120_ALLOCATION = [
  { topic: 'accounting', foundation: 8, interviewReady: 11, advanced: 5 },
  { topic: 'enterprise_value', foundation: 4, interviewReady: 5, advanced: 3 },
  { topic: 'valuation', foundation: 5, interviewReady: 9, advanced: 4 },
  { topic: 'dcf', foundation: 4, interviewReady: 8, advanced: 4 },
  { topic: 'ma', foundation: 4, interviewReady: 8, advanced: 4 },
  { topic: 'lbo', foundation: 3, interviewReady: 6, advanced: 3 },
  { topic: 'debt_credit', foundation: 2, interviewReady: 4, advanced: 2 },
  { topic: 'capital_markets', foundation: 2, interviewReady: 3, advanced: 1 },
  { topic: 'applied_judgement', foundation: 0, interviewReady: 3, advanced: 5 },
] as const;
