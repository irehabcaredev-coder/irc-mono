// Loads the RCI register CSV into the encrypted RciRegistration table. Idempotent: existing registrations are left alone.
// Usage: pnpm exec ts-node-dev --transpile-only src/scripts/import-rci.ts "/path/to/export.csv"
import 'dotenv/config';
import fs from 'fs';
import prisma from '../config/prisma';
import { encryptRciData, hashRegistrationNo, normalizeRegistrationNo } from '../utils/rciCrypto';

const parseCsv = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (c === '"') quoted = false;
            else cell += c;
        } else if (c === '"') quoted = true;
        else if (c === ',') { row.push(cell); cell = ''; }
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(cell); cell = '';
            if (row.some(Boolean)) rows.push(row);
            row = [];
        } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
};

const tidy = (v: string) => v.replace(/\s+/g, ' ').trim() || null;

const main = async () => {
    const file = process.argv[2];
    if (!file) throw new Error('Pass the CSV path as the first argument');
    const [, ...rows] = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));

    // Columns: S.NO, Registration NO, Name & Father/Husband Name, Address, STATE, Email Id/Mobile No, Registration Status, Qualification, Registered As
    const byHash = new Map<string, { registrationNoHash: string; isActive: boolean; data: string }>();
    for (const r of rows) {
        const registrationNo = normalizeRegistrationNo(r[1] || '');
        if (!registrationNo) continue;
        const registrationNoHash = hashRegistrationNo(registrationNo);
        if (byHash.has(registrationNoHash)) continue;
        byHash.set(registrationNoHash, {
            registrationNoHash,
            isActive: r[6].trim() === 'Active',
            data: encryptRciData({
                registrationNo,
                name: tidy(r[2]),
                address: tidy(r[3]),
                state: tidy(r[4]),
                contactMasked: tidy(r[5]),
                qualification: tidy(r[7]),
                registeredAs: tidy(r[8]),
            }),
        });
    }

    const all = [...byHash.values()];
    let inserted = 0;
    for (let i = 0; i < all.length; i += 500) {
        inserted += (await prisma.rciRegistration.createMany({ data: all.slice(i, i + 500), skipDuplicates: true })).count;
    }
    console.log(`${rows.length} CSV rows, ${all.length} unique registrations, ${inserted} inserted`);
};

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
