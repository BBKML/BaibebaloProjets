/**
 * Tests de confirmation Admin - Page Login accessible
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from '../../src/pages/Login.jsx';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

describe('Login (confirmation)', () => {
  it('affiche un formulaire de connexion', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </QueryClientProvider>
    );
    const form = document.querySelector('form');
    expect(form).toBeTruthy();
  });
});
