'use strict';

// Mocha's spec reporter, plus a markdown results table appended to the GitHub
// Actions job summary when $GITHUB_STEP_SUMMARY is set (i.e. only in CI).

const fs = require('fs');
const Mocha = require('mocha');

const { EVENT_TEST_PASS, EVENT_TEST_FAIL, EVENT_TEST_PENDING, EVENT_RUN_END } = Mocha.Runner.constants;

const escapeCell = (text) => String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const escapeHtml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

class GithubSummaryReporter extends Mocha.reporters.Spec {
  constructor(runner, options) {
    super(runner, options);

    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (!summaryFile) {
      return;
    }

    const results = [];
    runner.on(EVENT_TEST_PASS, (test) => results.push({ icon: '✅', test }));
    runner.on(EVENT_TEST_FAIL, (test, err) => results.push({ icon: '❌', test, err }));
    runner.on(EVENT_TEST_PENDING, (test) => results.push({ icon: '⏭️', test }));

    runner.once(EVENT_RUN_END, () => {
      const { passes, failures, pending, duration } = this.stats;
      const lines = [
        '### Test results',
        '',
        `✅ ${passes} passed · ❌ ${failures} failed · ⏭️ ${pending} pending · ${(duration / 1000).toFixed(2)}s`,
        '',
        '| | Test | Duration |',
        '|---|---|---:|',
        ...results.map(
          ({ icon, test }) =>
            `| ${icon} | ${escapeCell(test.fullTitle())} | ${
              test.duration === undefined ? '' : `${test.duration}ms`
            } |`,
        ),
        '',
      ];

      for (const { test, err } of results.filter((result) => result.err)) {
        lines.push(
          `<details><summary>❌ ${escapeHtml(test.fullTitle())}</summary>`,
          '',
          '```',
          err.stack || err.message || String(err),
          '```',
          '',
          '</details>',
          '',
        );
      }

      fs.appendFileSync(summaryFile, lines.join('\n') + '\n');
    });
  }
}

module.exports = GithubSummaryReporter;
