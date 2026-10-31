// Loads the bundled provider agreement into the Agreement table. Idempotent.
// Usage: pnpm exec ts-node-dev --transpile-only --exit-child src/scripts/seed-agreements.ts
import 'dotenv/config';
import { seedProviderAgreement } from '../agreements/agreement.service';

seedProviderAgreement()
    .then((r) => { console.log(r.created ? 'Agreement seeded' : 'Agreement already up to date', r.contentHash); process.exit(0); })
    .catch((e) => { console.error(e.message); process.exit(1); });
