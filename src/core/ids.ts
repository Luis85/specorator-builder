// Pure id/slug helpers.

/** Slugify a string into a URL/identifier-safe token. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Short, reasonably-unique id for a Project. Not cryptographic — just stable and
 * collision-resistant enough for vault-local identity.
 */
export function shortId(rng: () => number = Math.random): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(rng() * alphabet.length)];
  }
  return out;
}
