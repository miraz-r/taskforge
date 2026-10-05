/** Minimal class-name joiner. Falsy values are dropped; order is preserved. */
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(' ')
}
