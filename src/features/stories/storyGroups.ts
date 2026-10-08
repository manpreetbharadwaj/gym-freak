import type { Story } from '@/types/domain';

/** One Stories & Tips card: every live story that shares a category key (e.g. "coach-tips"). */
export interface StoryGroup {
  /** The category key the server stores on each story; the display name is a translation of it. */
  category: string;
  /** In feed order (server priority, then date). */
  stories: Story[];
  /** True once every story in the group has been viewed. */
  viewed: boolean;
}

/**
 * Groups the feed by category key — one card per category no matter how many stories it holds.
 * Groups keep the order of their first story in the feed; groups with something unseen come first.
 */
export function groupStories(stories: Story[]): StoryGroup[] {
  const groups = new Map<string, Story[]>();
  for (const story of stories) {
    const list = groups.get(story.category);
    if (list) list.push(story);
    else groups.set(story.category, [story]);
  }
  const all = [...groups].map(([category, list]) => ({ category, stories: list, viewed: list.every((s) => s.viewed) }));
  return [...all.filter((g) => !g.viewed), ...all.filter((g) => g.viewed)];
}

/** Where to begin inside a group: the requested story, else the first unseen one, else the first. */
export function startIndex(group: Story[], startId?: string) {
  const requested = startId ? group.findIndex((s) => s.id === startId) : -1;
  if (requested >= 0) return requested;
  const unseen = group.findIndex((s) => !s.viewed);
  return unseen >= 0 ? unseen : 0;
}

/** The card's picture: the first unseen story (what tapping will play), else the first story. */
export const coverStory = (group: StoryGroup) => group.stories.find((s) => !s.viewed) ?? group.stories[0];
