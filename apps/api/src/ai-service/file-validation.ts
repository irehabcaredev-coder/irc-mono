// The client-declared MIME type is untrusted; confirm the bytes really are what they claim to be.
const SIGNATURES: Record<string, number[]> = {
    'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'image/jpeg': [0xff, 0xd8, 0xff],
    'application/pdf': [0x25, 0x50, 0x44, 0x46], // "%PDF"
};

export const fileMatchesType = (mimeType: string, data: Buffer): boolean => {
    const sig = SIGNATURES[mimeType];
    return !!sig && data.length >= sig.length && sig.every((byte, i) => data[i] === byte);
};
