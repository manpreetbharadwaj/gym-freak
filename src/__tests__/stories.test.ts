import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coverStory, groupStories, startIndex } from '../features/stories/storyGroups';
import type { Story } from '../types/domain';

const story = (id: string, category: string, viewed = false): Story => ({ id, title: id, category, viewed, locked: false, media: {} }) as Story;

test('one card per category, however many stories it holds; feed order kept inside each group', () => {
  const feed = [story('t1', 'coach-tips'), story('n1', 'nutrition'), story('t2', 'coach-tips'), story('t3', 'coach-tips'), story('t4', 'coach-tips')];
  const groups = groupStories(feed);
  assert.deepEqual(groups.map((g) => g.category), ['coach-tips', 'nutrition']);
  assert.deepEqual(groups[0].stories.map((s) => s.id), ['t1', 't2', 't3', 't4']);
  // A fifth published story joins the existing card instead of adding one.
  const more = groupStories([...feed, story('t5', 'coach-tips')]);
  assert.equal(more.length, 2);
  assert.equal(more[0].stories.length, 5);
});

test('groups by category key, never by title; fully watched groups move to the end', () => {
  const groups = groupStories([story('a', 'coach-tips', true), story('b', 'nutrition'), story('c', 'coach-tips', true)]);
  assert.deepEqual(groups.map((g) => [g.category, g.viewed]), [['nutrition', false], ['coach-tips', true]]);
  assert.equal(groupStories([]).length, 0);
});

test('playback starts at the requested story, else the first unseen one, else the first', () => {
  const tips = [story('t1', 'coach-tips', true), story('t2', 'coach-tips'), story('t3', 'coach-tips')];
  assert.equal(startIndex(tips), 1);
  assert.equal(startIndex(tips, 't3'), 2);
  assert.equal(startIndex(tips, 'missing'), 1);
  assert.equal(startIndex(tips.map((s) => ({ ...s, viewed: true }))), 0);
  assert.equal(coverStory({ category: 'coach-tips', stories: tips, viewed: false }).id, 't2');
});
