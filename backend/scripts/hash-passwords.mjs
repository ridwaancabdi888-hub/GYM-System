// Utility: prints bcrypt hashes for the demo passwords used in database/seed.sql.
// Run with: npm run hash-passwords (from backend/)
import bcrypt from 'bcryptjs';

const passwords = {
  'SuperAdmin@123': null,
  'Admin@123': null,
  'Staff@123': null,
  'Member@123': null,
};

for (const plain of Object.keys(passwords)) {
  passwords[plain] = await bcrypt.hash(plain, 10);
}

console.log(JSON.stringify(passwords, null, 2));
