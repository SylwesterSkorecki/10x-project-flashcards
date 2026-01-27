import { createHash } from "node:crypto";

/**
 * Generates a SHA-256 hash of the provided text.
 * Used primarily for hashing source text in AI generation operations
 * to detect duplicate generation requests and for caching purposes.
 *
 * @param text - The text to hash
 * @returns A hexadecimal string representation of the SHA-256 hash
 *
 * @example
 * ```typescript
 * const hash = hashSourceText("Hello, world!");
 * // Returns: "315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3"
 * ```
 */
export function hashSourceText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
