import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { zohoProfile as zoho } from '../test/fixtures';
import { StartScreen } from './StartScreen';

describe('StartScreen', () => {
  it('starts only after a PDF is chosen and consent is given', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<StartScreen companies={[]} busy={false} error="" onStart={onStart} />);
    const start = screen.getByRole('button', { name: /start the hot seat/i });
    expect(start).toBeDisabled();
    await user.upload(screen.getByLabelText(/resume \(pdf/i), new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' }));
    expect(start).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    await user.click(start);
    expect(onStart).toHaveBeenCalledWith(expect.any(File), 'general');
  });

  it('shows the preparation guide once a company is chosen', async () => {
    const user = userEvent.setup();
    render(<StartScreen companies={[zoho]} busy={false} error="" onStart={vi.fn()} />);
    expect(screen.queryByRole('heading', { name: /preparation guide/i })).toBeNull();
    await user.selectOptions(screen.getByLabelText(/target company/i), 'zoho');
    expect(screen.getByRole('heading', { name: /preparation guide: zoho/i })).toBeInTheDocument();
  });

  it('rejects non-PDF files with a visible message', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<StartScreen companies={[]} busy={false} error="" onStart={vi.fn()} />);
    await user.upload(screen.getByLabelText(/resume \(pdf/i), new File(['x'], 'notes.txt', { type: 'text/plain' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/pdf/i);
  });
});
