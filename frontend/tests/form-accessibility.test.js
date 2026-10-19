import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getFieldControlProps, mergeDescribedBy } from '../src/utils/formAccessibility.js';

describe('form accessibility utilities', () => {
  it('links a control to its field and error message', () => {
    const props = getFieldControlProps({}, {
      controlId: 'member-name',
      errorId: 'member-name-error',
      error: 'Enter a member name',
    });

    assert.deepEqual(props, {
      id: 'member-name',
      'aria-describedby': 'member-name-error',
      'aria-invalid': true,
    });
  });

  it('preserves explicit control accessibility attributes', () => {
    const props = getFieldControlProps({
      id: 'custom-id',
      'aria-describedby': 'help-text',
      'aria-invalid': false,
    }, {
      controlId: 'generated-id',
      errorId: 'generated-error',
      error: 'Invalid value',
    });

    assert.deepEqual(props, {
      id: 'custom-id',
      'aria-describedby': 'help-text generated-error',
      'aria-invalid': false,
    });
  });

  it('deduplicates description references and omits empty values', () => {
    assert.equal(mergeDescribedBy('hint error', undefined, 'error'), 'hint error');
    assert.equal(mergeDescribedBy('', null), undefined);
  });

  it('adds no attributes when a control is outside a form field', () => {
    assert.deepEqual(getFieldControlProps({ id: 'standalone' }, null), {});
  });
});
