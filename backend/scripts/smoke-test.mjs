// End-to-end smoke test against a running backend (local or deployed).
// Usage: BASE_URL=http://localhost:4000 npm run smoke-test
// Exercises: login for each demo role, tenant isolation, and core CRUD.

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

let passed = 0;
let failed = 0;

function check(label, condition) {
  if (condition) {
    passed++;
    console.log(`  OK  ${label}`);
  } else {
    failed++;
    console.log(`FAIL  ${label}`);
  }
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function login(identifier, password) {
  const { status, data } = await api('/api/auth/login', { method: 'POST', body: { identifier, password } });
  return { status, token: data.token, profile: data.profile };
}

async function main() {
  console.log(`Running smoke test against ${BASE_URL}\n`);

  console.log('Super Admin login');
  const superAdmin = await login('superadmin@gymsaas.demo', 'SuperAdmin@123');
  check('super admin login succeeds', superAdmin.status === 200 && superAdmin.token);

  console.log('\nGym Admin login (Gym A)');
  const adminA = await login('admin@ironpeak.demo', 'Admin@123');
  check('gym admin A login succeeds', adminA.status === 200 && adminA.token);
  const gymAId = adminA.profile?.gymId;

  console.log('\nGym Admin login (Gym B)');
  const adminB = await login('admin@coastalstrength.demo', 'Admin@123');
  check('gym admin B login succeeds', adminB.status === 200 && adminB.token);

  console.log('\nStaff login');
  const staff = await login('ahmed@ironpeak.demo', 'Staff@123');
  check('staff login succeeds', staff.status === 200 && staff.token);

  console.log('\nMember login');
  const member = await login('farah.hassan', 'Member@123');
  check('member login succeeds', member.status === 200 && member.token);

  console.log('\nSuper Admin: list gyms');
  const gyms = await api('/api/superadmin/gyms', { token: superAdmin.token });
  check('super admin can list gyms', gyms.status === 200 && Array.isArray(gyms.data.gyms) && gyms.data.gyms.length >= 2);

  console.log('\nGym Admin A: list own members');
  const membersA = await api('/api/members', { token: adminA.token });
  check('gym admin A can list own members', membersA.status === 200 && membersA.data.members.length > 0);

  console.log('\nTenant isolation: Gym B admin cannot see Gym A member via direct ID');
  const firstMemberA = membersA.data.members[0];
  const crossAccess = await api(`/api/members/${firstMemberA.id}`, { token: adminB.token });
  check('gym B admin cannot read gym A member (expect 404)', crossAccess.status === 404);

  console.log('\nStaff without payments permission cannot access payments');
  const staffPayments = await api('/api/payments', { token: staff.token });
  check('staff without payments permission is blocked (expect 403)', staffPayments.status === 403);

  console.log('\nMember: self profile only');
  const memberProfile = await api('/api/member/me', { token: member.token });
  check('member can view own profile', memberProfile.status === 200);

  console.log('\nGym Admin A: create + check-in a member');
  const created = await api('/api/members', {
    method: 'POST',
    token: adminA.token,
    body: { fullName: 'Smoke Test Member', phone: '+252611999999', gender: 'male' },
  });
  check('gym admin A can create a member', created.status === 201);

  if (created.status === 201) {
    const checkin = await api('/api/attendance/check-in', {
      method: 'POST',
      token: adminA.token,
      body: { memberId: created.data.member.id },
    });
    check('check-in succeeds for newly created member', checkin.status === 201);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
