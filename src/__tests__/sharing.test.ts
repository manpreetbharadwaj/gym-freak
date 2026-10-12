import test from 'node:test';
import assert from 'node:assert/strict';
import { shareFormats, visibleShareMetrics } from '../features/sharing/types';

test('share cards export at the required social dimensions', () => {
  assert.deepEqual(shareFormats.story, { width: 1080, height: 1920, label: 'Story' });
  assert.deepEqual(shareFormats.portrait, { width: 1080, height: 1350, label: 'Portrait' });
  assert.deepEqual(shareFormats.square, { width: 1080, height: 1080, label: 'Square' });
  assert.deepEqual(shareFormats.landscape, { width: 1200, height: 630, label: 'Landscape' });
});

test('sensitive and estimated user metrics stay hidden until explicitly enabled', () => {
  const metrics = [{ id: 'duration', label: 'Duration', value: '30 min' }, { id: 'calories', label: 'Calories', value: '200 kcal', sensitive: true, estimated: true }];
  assert.deepEqual(visibleShareMetrics(metrics, false).map((item) => item.id), ['duration']);
  assert.deepEqual(visibleShareMetrics(metrics, true).map((item) => item.id), ['duration', 'calories']);
});
