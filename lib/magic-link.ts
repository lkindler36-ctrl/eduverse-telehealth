/** Public body is identical for known and unknown accounts. Never includes tokens. */
export function magicLinkAck() {
  return { ok: true as const };
}
