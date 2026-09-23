import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const workflow = readFileSync(new URL('../workflows/merge-count.yml', import.meta.url), 'utf8');
const script = workflow.split('          script: |')[1].split('      - name: Save merge history')[0]
  .split(/\r?\n/).map(line => line.replace(/^ {12}/, '')).join('\n');
const run = new (Object.getPrototypeOf(async function () {}).constructor)('github', 'context', 'core', 'require', script);

function harness(pulls, failure) {
  let report;
  let written = false;
  const summary = {
    addHeading() { return this; }, addRaw() { return this; }, addTable() { return this; },
    async write() { written = true; }
  };
  return {
    execute: () => run({
      rest: { pulls: { list: 'list-pulls' } },
      paginate: async (route, options) => {
        assert.equal(route, 'list-pulls');
        assert.deepEqual(options, { owner: 'owner', repo: 'repo', state: 'closed', base: 'main', per_page: 100 });
        if (failure) throw failure;
        return pulls;
      }
    }, { repo: { owner: 'owner', repo: 'repo' } }, { summary }, name => {
      assert.equal(name, 'node:fs');
      return { writeFileSync(path, content) { assert.equal(path, 'merge-history.json'); report = JSON.parse(content); } };
    }),
    result: () => ({ report, written })
  };
}

test('an empty PR history reports zero, not the number of direct pushes', async () => {
  const h = harness([]);
  await h.execute();
  assert.equal(h.result().report.mergedCount, 0);
  assert.deepEqual(h.result().report.merges, []);
  assert.equal(h.result().written, true);
});

test('only confirmed merges are counted and the full history is kept', async () => {
  const pulls = Array.from({ length: 23 }, (_, i) => ({ number: i + 1, merged_at: '2026-09-22T12:00:00Z', html_url: `https://github.com/owner/repo/pull/${i + 1}`, merge_commit_sha: `sha-${i + 1}` })).reverse();
  pulls.push({ number: 24, merged_at: null });
  const h = harness(pulls);
  await h.execute();
  assert.equal(h.result().report.mergedCount, 23);
  assert.equal(h.result().report.merges.length, 23);
  assert.equal(h.result().report.merges[0].number, 1);
  assert.equal(h.result().report.merges.at(-1).commit, 'sha-23');
});

test('API failures do not write an incorrect zero count', async () => {
  const h = harness([], new Error('API unavailable'));
  await assert.rejects(h.execute(), /API unavailable/);
  assert.equal(h.result().report, undefined);
  assert.equal(h.result().written, false);
});
