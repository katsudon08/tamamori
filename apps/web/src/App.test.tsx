import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App.js';

describe('App', () => {
  it('renders the service heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'たま森' })).toBeInTheDocument();
  });
});
