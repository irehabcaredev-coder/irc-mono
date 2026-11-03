// Creates (or resets the password of) an admin who can review RCI cards.
// Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' pnpm exec ts-node-dev --transpile-only --exit-child src/scripts/create-admin.ts
import 'dotenv/config';
import { createAdmin } from '../admin-service/admin.service';

const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters).');
    process.exit(1);
}

createAdmin(ADMIN_EMAIL, ADMIN_PASSWORD)
    .then((a) => { console.log('Admin ready:', a.email); process.exit(0); })
    .catch((e) => { console.error(e.message); process.exit(1); });
