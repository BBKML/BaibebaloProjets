/**
 * Tests structurels Admin - Composant Button
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../../src/components/common/Button.jsx';

describe('Button (structurel)', () => {
  it('affiche le contenu enfants', () => {
    render(<Button>Cliquer</Button>);
    expect(screen.getByRole('button', { name: /cliquer/i })).toBeInTheDocument();
  });

  it('appelle onClick au clic', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>OK</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('est disabled quand disabled=true', () => {
    render(<Button disabled>OK</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('affiche Chargement... quand loading=true', () => {
    render(<Button loading>OK</Button>);
    expect(screen.getByText(/chargement/i)).toBeInTheDocument();
  });
});
