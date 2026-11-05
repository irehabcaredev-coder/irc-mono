// Loads the bundled list of Indian cities into the City table. Idempotent.
// Usage: pnpm exec ts-node-dev --transpile-only --exit-child src/scripts/seed-cities.ts
import 'dotenv/config';
import { seedCities } from '../city-service/city.service';

seedCities()
    .then((n) => { console.log(`Cities seeded: ${n} new`); process.exit(0); })
    .catch((e) => { console.error(e.message); process.exit(1); });
