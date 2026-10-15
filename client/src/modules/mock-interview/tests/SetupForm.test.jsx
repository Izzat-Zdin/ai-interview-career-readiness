import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SetupForm } from '../components/SetupForm.jsx';

describe('SetupForm', () => {
  it('renders role and type selects', () => {
    render(<SetupForm onStart={vi.fn()} loading={false} />);
    expect(screen.getByText('Target Role')).toBeInTheDocument();
    expect(screen.getByText('Interview Type')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start interview/i })).toBeDisabled();
  });

  it('calls onStart when both selects are filled', () => {
    const onStart = vi.fn();
    render(<SetupForm onStart={onStart} loading={false} />);

    // Select role
    fireEvent.click(screen.getByRole('combobox', { name: /target role/i }));
    fireEvent.click(screen.getByText('Software Engineer'));

    // Select type
    fireEvent.click(screen.getByRole('combobox', { name: /interview type/i }));
    fireEvent.click(screen.getByText('HR Interview'));

    fireEvent.click(screen.getByRole('button', { name: /start interview/i }));
    expect(onStart).toHaveBeenCalledWith({ role: 'software-engineer', type: 'hr' });
  });
});
