// Sessions issued before the RCI rollout (2026-10-31 10:37:53 UTC) are revoked: everyone signs in again.
// Raise this to sign everybody out again (e.g. after a suspected token leak); lower values re-admit old tokens.
export const TOKENS_VALID_AFTER = 1793443073;

export const isTokenCurrent = (payload: any): boolean =>
    typeof payload?.iat === 'number' && payload.iat >= TOKENS_VALID_AFTER;
