import crypto from 'crypto';

// RCI register data is encrypted at rest (AES-256-GCM). The registration number is only ever stored as an
// HMAC "blind index" so it can be looked up without being readable. Both keys derive from RCI_ENCRYPTION_KEY
// (32 random bytes, base64: `openssl rand -base64 32`). Losing the key makes the stored data unreadable;
// the register can be re-imported from the source CSV with src/scripts/import-rci.ts.

const getMasterKey = (): Buffer => {
    const raw = process.env.RCI_ENCRYPTION_KEY;
    if (!raw) throw new Error('RCI_ENCRYPTION_KEY is not set');
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) throw new Error('RCI_ENCRYPTION_KEY must be 32 bytes, base64 encoded');
    return key;
};

const subKey = (label: string): Buffer =>
    Buffer.from(crypto.hkdfSync('sha256', getMasterKey(), Buffer.alloc(0), `rci:${label}`, 32));

export const normalizeRegistrationNo = (value: string): string => value.replace(/\s+/g, '').toUpperCase();

export const hashRegistrationNo = (registrationNo: string): string =>
    crypto.createHmac('sha256', subKey('index')).update(normalizeRegistrationNo(registrationNo)).digest('hex');

export const encryptRciData = (data: unknown): string => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', subKey('data'), iv);
    const ct = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), ct.toString('base64')].join('.');
};

export const decryptRciData = <T = Record<string, unknown>>(payload: string): T => {
    const [version, iv, tag, ct] = payload.split('.');
    if (version !== 'v1' || !iv || !tag || !ct) throw new Error('Unsupported RCI payload');
    const decipher = crypto.createDecipheriv('aes-256-gcm', subKey('data'), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString('utf8'));
};
