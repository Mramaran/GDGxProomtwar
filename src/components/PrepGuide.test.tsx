import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { zohoProfile as zoho } from '../test/fixtures';
import { PrepGuide } from './PrepGuide';

describe('PrepGuide', () => {
  it('shows every section of the company guide', () => {
    render(<PrepGuide company={zoho} />);
    expect(screen.getByRole('heading', { name: /preparation guide: zoho/i })).toBeInTheDocument();
    expect(screen.getByText(/based on 7 anonymised interview reports/i)).toBeInTheDocument();
    for (const text of [/Written test/, /Pointers/, /GeeksforGeeks/, /Reverse a linked list/, /Why Zoho\?/, /Practise C daily/]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it('turns resources into safe links that open in a new tab', () => {
    render(<PrepGuide company={zoho} />);
    const link = screen.getByRole('link', { name: /geeksforgeeks/i });
    expect(link).toHaveAttribute('href', 'https://www.geeksforgeeks.org/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAccessibleName(/opens in a new tab/i);
  });

  it('hides sections that have no content', () => {
    render(<PrepGuide company={{ ...zoho, resources: [], hrQuestions: [] }} />);
    expect(screen.queryByText(/resources to use/i)).toBeNull();
    expect(screen.queryByText(/hr questions/i)).toBeNull();
  });
});
