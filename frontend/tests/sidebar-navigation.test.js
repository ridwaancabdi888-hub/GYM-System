import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  focusSidebar,
  handleSidebarKeydown,
  isSidebarInteractive,
  subscribeToSidebarBreakpoint,
} from '../src/utils/sidebarNavigation.js';

function focusable() {
  return {
    hidden: false,
    focusCount: 0,
    getAttribute: () => null,
    focus() { this.focusCount += 1; },
  };
}

describe('mobile sidebar navigation utilities', () => {
  it('keeps the sidebar interactive only while open or on desktop', () => {
    assert.equal(isSidebarInteractive(false, false), false);
    assert.equal(isSidebarInteractive(true, false), true);
    assert.equal(isSidebarInteractive(false, true), true);
  });

  it('moves focus to the first navigation control', () => {
    const first = focusable();
    const sidebar = { querySelectorAll: () => [first] };

    focusSidebar(sidebar);

    assert.equal(first.focusCount, 1);
  });

  it('closes the sidebar when Escape is pressed', () => {
    const event = { key: 'Escape', prevented: false, preventDefault() { this.prevented = true; } };
    let closeCount = 0;

    handleSidebarKeydown(
      event,
      { querySelectorAll: () => [] },
      () => { closeCount += 1; },
    );

    assert.equal(event.prevented, true);
    assert.equal(closeCount, 1);
  });

  it('subscribes to modern breakpoint changes and cleans up', () => {
    let listener;
    let removed;
    const mediaQuery = {
      addEventListener: (event, callback) => { assert.equal(event, 'change'); listener = callback; },
      removeEventListener: (event, callback) => { assert.equal(event, 'change'); removed = callback; },
    };
    const values = [];

    const unsubscribe = subscribeToSidebarBreakpoint(mediaQuery, (matches) => values.push(matches));
    listener({ matches: true });
    unsubscribe();

    assert.deepEqual(values, [true]);
    assert.equal(removed, listener);
  });
});
