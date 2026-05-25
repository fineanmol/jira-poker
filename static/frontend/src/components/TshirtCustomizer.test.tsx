import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TshirtCustomizer } from './TshirtCustomizer';
import { DEFAULT_TSHIRT_MAPPING } from '../types';
import type { TshirtMapping } from '../types';

const defaultMapping: TshirtMapping = { ...DEFAULT_TSHIRT_MAPPING };

// ─── TshirtCustomizer ─────────────────────────────────────────────────────────

describe('TshirtCustomizer', () => {
  it('renders an expand toggle and is collapsed by default', () => {
    render(<TshirtCustomizer mapping={defaultMapping} saving={false} onSave={vi.fn()} />);
    // The <details> is closed — the grid / inputs should not be visible
    const details = document.querySelector('details');
    expect(details).not.toHaveAttribute('open');
  });

  it('expands and shows one input per T-shirt size when opened', async () => {
    render(<TshirtCustomizer mapping={defaultMapping} saving={false} onSave={vi.fn()} />);
    // Open the <details> element
    fireEvent.click(screen.getByText(/customize point values/i));
    // After opening, all six size inputs should be accessible
    expect(screen.getByLabelText('XS story points')).toBeInTheDocument();
    expect(screen.getByLabelText('XXL story points')).toBeInTheDocument();
  });

  it('pre-fills each input with the value from the supplied mapping', async () => {
    const mapping: TshirtMapping = { XS: 1, S: 2, M: 5, L: 8, XL: 13, XXL: 21 };
    render(<TshirtCustomizer mapping={mapping} saving={false} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText(/customize point values/i));

    expect(screen.getByLabelText('M story points')).toHaveValue(5);
    expect(screen.getByLabelText('XL story points')).toHaveValue(13);
  });

  it('calls onSave with the updated mapping when the user changes a value and saves', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<TshirtCustomizer mapping={defaultMapping} saving={false} onSave={onSave} />);
    fireEvent.click(screen.getByText(/customize point values/i));

    // Change XL from 8 to 20
    // fireEvent.change is the reliable way to set number inputs in jsdom
    const xlInput = screen.getByLabelText('XL story points');
    fireEvent.change(xlInput, { target: { value: '20' } });

    await user.click(screen.getByRole('button', { name: /save mapping/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
      const saved: TshirtMapping = onSave.mock.calls[0][0];
      expect(saved.XL).toBe(20);
      // Other values should remain at their defaults
      expect(saved.XS).toBe(defaultMapping.XS);
      expect(saved.M).toBe(defaultMapping.M);
    });
  });

  it('disables the Save button while saving is true', () => {
    render(<TshirtCustomizer mapping={defaultMapping} saving={true} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText(/customize point values/i));
    expect(screen.getByRole('button', { name: /save mapping/i })).toBeDisabled();
  });
});
