/**
 * Quick demo: run the full scoring pipeline against the brief's
 * synthetic Y2 UNSW Co-op HD JPM student and print the structured
 * output. This is what the Phase 3 LLM layer will receive.
 *
 *   tsx scripts/score-demo.ts
 */

import { loadProfessionalsFromXlsx } from '../lib/db/xlsx.js';
import { score } from '../lib/scoring/index.js';
import { Y2_UNSW_COOP_HD_JPM, TEST_NOW } from '../tests/scoring/fixtures.js';

const pros = loadProfessionalsFromXlsx();
const out = score(Y2_UNSW_COOP_HD_JPM, pros, { now: TEST_NOW });

console.log(JSON.stringify(out, null, 2));
