import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(path) {
  return readFileSync(join(frontendRoot, path), 'utf8');
}

const dataTablePages = [
  'src/pages/superadmin/GymsList.jsx',
  'src/pages/member/MemberPayments.jsx',
  'src/pages/member/MemberAttendance.jsx',
  'src/pages/admin/Members.jsx',
  'src/pages/admin/Staff.jsx',
  'src/pages/admin/ActivityLogs.jsx',
  'src/pages/admin/MembershipPlans.jsx',
  'src/pages/admin/Attendance.jsx',
  'src/pages/admin/Payments.jsx',
];

describe('table accessibility', () => {
  it('gives the shared table a caption, scoped headers, and a keyboard-scrollable region', () => {
    const component = source('src/components/DataTable.jsx');

    assert.match(component, /<caption className="sr-only">\{caption\}<\/caption>/);
    assert.match(component, /scope="col"/);
    assert.match(component, /role="region"/);
    assert.match(component, /tabIndex=\{0\}/);
    assert.match(component, /aria-label=\{`\$\{caption\}, scrollable table`\}/);
  });

  for (const page of dataTablePages) {
    it(`provides an explicit table caption in ${page}`, () => {
      const pageSource = source(page);
      const usages = pageSource.split('<DataTable').slice(1);

      assert.ok(usages.length > 0, 'expected at least one DataTable usage');
      usages.forEach((usage) => {
        assert.match(usage.split('/>')[0], /\bcaption="[^"]+"/);
      });
    });
  }

  it('labels the report tables and scopes their column headers', () => {
    const reports = source('src/pages/admin/Reports.jsx');

    assert.equal((reports.match(/<caption className="sr-only">/g) || []).length, 2);
    assert.equal((reports.match(/<th scope="col"/g) || []).length, 4);
  });
});
