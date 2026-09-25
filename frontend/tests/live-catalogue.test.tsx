// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Listing } from '../src/listings-data';
const live = vi.hoisted(() => ({ items: [] as Listing[], loading: false, error: false }));
vi.mock('../src/lib/public-listings', () => ({ publicListingsEnabled: true, usePublicListings: () => live }));
import { FeaturedProperties, ListingsPage } from '../src/listings';
let root: Root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  live.items = []; live.loading = false; live.error = false;
  vi.stubGlobal('scrollTo', vi.fn());
  document.body.innerHTML = '<div id="test"></div>';
  root = createRoot(document.getElementById('test')!);
});
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals(); });
it('does not turn an empty live database into fictional sale listings on the homepage or catalogue', async () => {
  await act(async () => root.render(<><FeaturedProperties lang="en"/><ListingsPage lang="en" hash="#proprietes"/></>));
  expect(document.querySelectorAll('.property-card')).toHaveLength(0);
  expect(document.body.textContent).toContain('No approved listings');
  expect(document.body.textContent).not.toContain('Examples are shown below');
});
it('shows a database error instead of falling back to fictional listings', async () => {
  live.error = true;
  await act(async () => root.render(<ListingsPage lang="en" hash="#proprietes"/>));
  expect(document.querySelector('[role=alert]')).not.toBeNull();
  expect(document.querySelectorAll('.property-card')).toHaveLength(0);
});
