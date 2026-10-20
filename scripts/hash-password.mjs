// Prints a PBKDF2 hash for the admin password: node scripts/hash-password.mjs
// Put the output into ADMIN_PASSWORD_HASH (src/admin/auth.ts) or the GitHub variable VITE_ADMIN_PASSWORD_HASH.
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';

const ITERATIONS = 600000;

const password = process.env.ADMIN_PASSWORD ?? (await new Promise((resolve) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Новый пароль админки: ', (answer) => {
    rl.close();
    resolve(answer);
  });
}));

if (!password) {
  console.error('Пароль пустой');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
console.log(`pbkdf2$${ITERATIONS}$${salt.toString('hex')}$${hash.toString('hex')}`);
