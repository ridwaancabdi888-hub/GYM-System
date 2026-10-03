import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeMemberStatus } from '../src/utils/memberStatus.js';
import { computePaymentStatus } from '../src/utils/paymentStatus.js';
import { isValidEmail, requireFields, ValidationError } from '../src/utils/validate.js';

const isoDate = (offsetDays = 0) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

describe('computeMemberStatus', () => {
  it('preserves an explicit inactive status regardless of expiry', () => {
    assert.equal(computeMemberStatus(isoDate(30), 'inactive'), 'inactive');
  });

  it('treats members without an expiry date as active', () => {
    assert.equal(computeMemberStatus(null, 'active'), 'active');
  });

  it('expires past memberships but keeps today and future active', () => {
    assert.equal(computeMemberStatus(isoDate(-1), 'active'), 'expired');
    assert.equal(computeMemberStatus(isoDate(), 'active'), 'active');
    assert.equal(computeMemberStatus(isoDate(1), 'expired'), 'active');
  });
});

describe('computePaymentStatus', () => {
  it('marks fully paid, overpaid, and zero-cost memberships as paid', () => {
    assert.equal(computePaymentStatus(20, 20, isoDate(5)), 'paid');
    assert.equal(computePaymentStatus('20', '25', isoDate(-5)), 'paid');
    assert.equal(computePaymentStatus(0, 0, isoDate(5)), 'paid');
  });

  it('marks any positive balance payment as partial regardless of date', () => {
    assert.equal(computePaymentStatus(20, 5, isoDate(-1)), 'partially_paid');
    assert.equal(computePaymentStatus(20, 5, isoDate(1)), 'partially_paid');
  });

  it('distinguishes unpaid due memberships from future pending ones', () => {
    assert.equal(computePaymentStatus(20, 0, isoDate(-1)), 'unpaid');
    assert.equal(computePaymentStatus(20, 0, isoDate()), 'unpaid');
    assert.equal(computePaymentStatus(20, 0, isoDate(1)), 'pending');
    assert.equal(computePaymentStatus(20, 0, null), 'pending');
  });
});

describe('validation helpers', () => {
  it('accepts present values including zero and false', () => {
    assert.doesNotThrow(() => requireFields({ name: 'Gym', price: 0, active: false }, ['name', 'price', 'active']));
  });

  it('reports every undefined, null, or empty required field', () => {
    assert.throws(
      () => requireFields({ name: '', email: null }, ['name', 'email', 'phone']),
      (error) => {
        assert.ok(error instanceof ValidationError);
        assert.equal(error.status, 400);
        assert.equal(error.message, 'Missing required field(s): name, email, phone');
        return true;
      },
    );
  });

  it('accepts ordinary email addresses and rejects malformed values', () => {
    assert.equal(isValidEmail('admin@gym.example'), true);
    assert.equal(isValidEmail('admin @gym.example'), false);
    assert.equal(isValidEmail('admin@gym'), false);
    assert.equal(isValidEmail('gym.example'), false);
  });
});
