import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLatestRequestGuard, memberLookupStatus } from '../src/utils/latestRequest.js';

describe('latest request guard', () => {
  it('marks a request current until a newer request begins', () => {
    const guard = createLatestRequestGuard();
    const firstIsCurrent = guard.next();

    assert.equal(firstIsCurrent(), true);

    const secondIsCurrent = guard.next();
    assert.equal(firstIsCurrent(), false);
    assert.equal(secondIsCurrent(), true);
  });

  it('invalidates an in-flight request when its UI flow is cleared', () => {
    const guard = createLatestRequestGuard();
    const isCurrent = guard.next();

    guard.invalidate();

    assert.equal(isCurrent(), false);
  });

  it('allows a fresh request after invalidation', () => {
    const guard = createLatestRequestGuard();
    const staleRequest = guard.next();
    guard.invalidate();
    const freshRequest = guard.next();

    assert.equal(staleRequest(), false);
    assert.equal(freshRequest(), true);
  });
});

describe('member lookup status', () => {
  it('distinguishes loading, failure, and empty results', () => {
    assert.equal(memberLookupStatus({ query: 'A', loading: true, failed: false, resultCount: 0 }), 'Searching members…');
    assert.equal(memberLookupStatus({ query: 'A', loading: false, failed: true, resultCount: 0 }), 'Member search failed. Try again.');
    assert.equal(memberLookupStatus({ query: 'A', loading: false, failed: false, resultCount: 0 }), 'No matching members found.');
    assert.equal(memberLookupStatus({ query: ' ', loading: false, failed: false, resultCount: 0 }), '');
  });

  it('uses singular and plural result announcements', () => {
    assert.equal(memberLookupStatus({ query: 'A', loading: false, failed: false, resultCount: 1 }), '1 matching member found.');
    assert.equal(memberLookupStatus({ query: 'A', loading: false, failed: false, resultCount: 3 }), '3 matching members found.');
  });
});
