/**
 * Tests fonctionnels Admin - Smoke : une page majeure (Login) se monte sans erreur
 * (App complet contient déjà un BrowserRouter, on évite de le doubler.)
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from '../../src/pages/Login.jsx';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

describe('App (fonctionnel / smoke)', () => {
  it('monte une page majeure (Login) sans crash', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(container).toBeInTheDocument();
  });
});
