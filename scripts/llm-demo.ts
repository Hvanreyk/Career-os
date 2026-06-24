/**
 * End-to-end demo: score the Y2 UNSW Co-op HD JPM student, pass the
 * structured output to Claude, and print the prose report to the terminal.
 *
 *   tsx scripts/llm-demo.ts
 */

import { loadProfessionalsFromXlsx } from '../lib/db/xlsx.js';
import { score } from '../lib/scoring/index.js';
import { generateReport } from '../lib/llm/index.js';
import { Y2_UNSW_COOP_HD_JPM, TEST_NOW } from '../tests/scoring/fixtures.js';

void (async () => {
  const pros = loadProfessionalsFromXlsx();
  const scoringOutput = score(Y2_UNSW_COOP_HD_JPM, pros, { now: TEST_NOW });

  console.log('--- SCORING OUTPUT (stage, fit, actions) ---');
  console.log(`Stage: ${scoringOutput.stage} — ${scoringOutput.stage_description}`);
  console.log(`Fit:   ${scoringOutput.match_summary.fit_band}`);
  console.log(`Pool:  ${scoringOutput.match_summary.pool_size} matched\n`);

  console.log('--- GENERATING REPORT (OpenAI API) ---\n');
  const report = await generateReport(scoringOutput);

  console.log('='.repeat(60));
  console.log(report.markdown);
  console.log('='.repeat(60));
  console.log(`\nModel: ${report.model}`);
  console.log(`Tokens: ${report.usage.input_tokens} in / ${report.usage.output_tokens} out`);
})();
