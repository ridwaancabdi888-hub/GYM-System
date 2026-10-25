// Tracks the newest request in a UI flow where responses may arrive out of
// order. Call `next` before starting a request and check the returned function
// before applying its result.
export function createLatestRequestGuard() {
  let currentRequest = 0;

  return {
    next() {
      const request = ++currentRequest;
      return () => request === currentRequest;
    },
    invalidate() {
      currentRequest += 1;
    },
  };
}

export function memberLookupStatus({ query, loading, failed, resultCount }) {
  if (loading) return 'Searching members…';
  if (failed) return 'Member search failed. Try again.';
  if (query.trim() && resultCount === 0) return 'No matching members found.';
  if (resultCount > 0) {
    return `${resultCount} matching ${resultCount === 1 ? 'member' : 'members'} found.`;
  }
  return '';
}
