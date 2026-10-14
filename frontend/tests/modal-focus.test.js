import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getFocusableElements, handleDialogKeydown } from '../src/utils/modalFocus.js';

function element({ hidden = false, ariaHidden = null } = {}) {
  return {
    hidden,
    focusCount: 0,
    getAttribute: (name) => (name === 'aria-hidden' ? ariaHidden : null),
    focus() { this.focusCount += 1; },
  };
}

function keyEvent(key, shiftKey = false) {
  return {
    key,
    shiftKey,
    prevented: false,
    preventDefault() { this.prevented = true; },
  };
}

describe('modal focus utilities', () => {
  it('excludes hidden controls from the focus order', () => {
    const visible = element();
    const dialog = {
      querySelectorAll: () => [visible, element({ hidden: true }), element({ ariaHidden: 'true' })],
    };

    assert.deepEqual(getFocusableElements(dialog), [visible]);
  });

  it('closes the dialog when Escape is pressed', () => {
    const event = keyEvent('Escape');
    let closeCount = 0;
    handleDialogKeydown(event, { querySelectorAll: () => [] }, () => { closeCount += 1; });

    assert.equal(event.prevented, true);
    assert.equal(closeCount, 1);
  });

  it('keeps focus on an empty dialog', () => {
    const event = keyEvent('Tab');
    const dialog = { focusCount: 0, querySelectorAll: () => [], focus() { this.focusCount += 1; } };
    handleDialogKeydown(event, dialog, () => {});

    assert.equal(event.prevented, true);
    assert.equal(dialog.focusCount, 1);
  });

  it('wraps Tab and Shift+Tab inside the dialog', () => {
    const first = element();
    const last = element();
    const dialog = { querySelectorAll: () => [first, last] };

    const forward = keyEvent('Tab');
    handleDialogKeydown(forward, dialog, () => {}, { activeElement: last });
    assert.equal(forward.prevented, true);
    assert.equal(first.focusCount, 1);

    const backward = keyEvent('Tab', true);
    handleDialogKeydown(backward, dialog, () => {}, { activeElement: first });
    assert.equal(backward.prevented, true);
    assert.equal(last.focusCount, 1);
  });
});
