import { describe, expect, it } from 'vitest';
import { resourceLink } from './resourceLinks';

describe('resourceLink', () => {
  it('links well-known sites to their official URL, whatever the spelling', () => {
    expect(resourceLink('GeeksforGeeks')).toBe('https://www.geeksforgeeks.org/');
    expect(resourceLink('Indiabix.com')).toBe('https://www.indiabix.com/');
    expect(resourceLink("Striver's SDE Sheet")).toBe('https://takeuforward.org/');
    expect(resourceLink('TakeYouForward')).toBe('https://takeuforward.org/');
    expect(resourceLink('AnalyticsVidya')).toBe('https://www.analyticsvidhya.com/');
  });

  it('sends YouTube teachers to a YouTube search', () => {
    expect(resourceLink('Telusko')).toBe('https://www.youtube.com/results?search_query=Telusko');
    expect(resourceLink('Jenny’s Lectures YouTube Channel')).toMatch(/^https:\/\/www\.youtube\.com\/results\?search_query=/);
  });

  it('falls back to a Google search for books and anything unknown', () => {
    expect(resourceLink('R.S. Aggarwal')).toBe(
      'https://www.google.com/search?q=R.S.%20Aggarwal%20placement%20preparation',
    );
  });

  it('only ever produces https links', () => {
    for (const name of ['javascript:alert(1)', '<script>', 'LeetCode', 'Telusko']) {
      expect(resourceLink(name)).toMatch(/^https:\/\//);
    }
  });
});
