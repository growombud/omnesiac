export default interface OmnesiacOptions {
  ttl?: number;
  blocking?: boolean;
  /** No longer used: blocking callers await the in-flight call instead of polling. Still accepted for compatibility. */
  pollFrequencyMs?: number;
}
