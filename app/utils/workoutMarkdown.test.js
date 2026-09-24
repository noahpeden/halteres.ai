import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  escapeHtml,
  getWorkoutDisplayBody,
  normalizeWorkoutMarkdown,
  renderWorkoutMarkdown,
  withDisplayBody,
} from './workoutMarkdown.js';

const LEAKED = `Week 1, Day 1: Squat + Upper",
"body": "### Strength\\n- Back Squat 5x3 @ **275 lb**\\n### Metcon\\n- 12 min AMRAP: 10 pull-ups, 15 wall-balls"`;

describe('workout markdown normalize + render', () => {
  it('unescapes literal \\\\n so ## headers become real sections', () => {
    const normalized = normalizeWorkoutMarkdown('## Strength\\n- Squat 5x3 @ **275 lb**');
    assert.match(normalized, /^## Strength\n/);
    assert.equal(normalized.includes('\\n'), false);

    const html = renderWorkoutMarkdown('## Strength\\n- Squat 5x3 @ **275 lb**');
    assert.match(html, /<h2>Strength<\/h2>/);
    assert.match(html, /<li>Squat 5x3 @ <strong>275 lb<\/strong><\/li>/);
    assert.doesNotMatch(html, /## Strength/);
  });

  it('unwraps leaked title/body JSON and still sections Strength / Metcon', () => {
    const html = renderWorkoutMarkdown(LEAKED);
    assert.match(html, /<h3>Strength<\/h3>/);
    assert.match(html, /<h3>Metcon<\/h3>/);
    assert.match(html, /<strong>275 lb<\/strong>/);
    assert.doesNotMatch(html, /"body"/);
    assert.doesNotMatch(html, /Week 1, Day 1/);
  });

  it('escapes HTML so raw tags cannot leak into the page', () => {
    assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
    const html = renderWorkoutMarkdown('## Strength\n- <script>alert(1)</script> **275**');
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /<strong>275<\/strong>/);
  });

  it('prefers body_skeleton when body is null so skeleton-only days render', () => {
    const samWeek1Day1 =
      '**Primary Work**\n\nBack Squat: 4 x 5 @ 75% 1RM\n\n**Secondary Work**\n\nRow Intervals: 6 x 500m @ moderate pace, rest 1:30 between efforts';
    assert.equal(
      getWorkoutDisplayBody({
        title: 'Week 1, Day 1: Lower Body Strength + Short Intervals',
        body: null,
        description: null,
        body_skeleton: samWeek1Day1,
        generation_status: 'skeleton',
      }),
      samWeek1Day1
    );
    const html = renderWorkoutMarkdown(samWeek1Day1);
    assert.match(html, /Back Squat: 4 x 5 @ 75% 1RM/);
    assert.match(html, /Row Intervals/);
    const skeleton = '## Strength\n- Back Squat 5x3 @ **275 lb**';
    assert.equal(
      getWorkoutDisplayBody({
        title: 'Week 1, Day 1: Lower Body Strength + Short Intervals',
        body: null,
        description: null,
        body_skeleton: skeleton,
      }),
      skeleton
    );
    assert.equal(getWorkoutDisplayBody({ body: '', description: 'No description provided.' }), '');
    const mapped = withDisplayBody({
      title: 'Week 1, Day 1',
      body: null,
      body_skeleton: skeleton,
    });
    assert.equal(mapped.description, skeleton);
    assert.equal(mapped.body, skeleton);
  });

  it('renders numbered lists and leaves empty input blank', () => {
    const html = renderWorkoutMarkdown('1. Bike 10 cal\n2. Rest 1:00');
    assert.match(html, /<ol>/);
    assert.match(html, /<li>Bike 10 cal<\/li>/);
    assert.equal(renderWorkoutMarkdown(''), '');
    assert.equal(normalizeWorkoutMarkdown(null), '');
  });
});
