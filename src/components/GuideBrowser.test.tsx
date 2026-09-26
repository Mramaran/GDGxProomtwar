import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { zohoProfile } from '../test/fixtures';
import { GuideBrowser } from './GuideBrowser';

const tcs = { ...zohoProfile, id: 'tcs', name: 'TCS' };

describe('GuideBrowser', () => {
  it('shows the first company guide straight away', () => {
    render(<GuideBrowser companies={[tcs, zohoProfile]} />);
    expect(screen.getByRole('heading', { name: /preparation guide: tcs/i })).toBeInTheDocument();
  });

  it('switches the guide when another company is chosen', async () => {
    const user = userEvent.setup();
    render(<GuideBrowser companies={[tcs, zohoProfile]} />);
    await user.selectOptions(screen.getByLabelText(/company/i), 'zoho');
    expect(screen.getByRole('heading', { name: /preparation guide: zoho/i })).toBeInTheDocument();
  });

  it('explains when no company data is available', () => {
    render(<GuideBrowser companies={[]} />);
    expect(screen.getByText(/no company guides/i)).toBeInTheDocument();
  });
});
