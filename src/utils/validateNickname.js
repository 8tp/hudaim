const NICKNAME_REGEX = /^[a-zA-Z0-9 _.\-]+$/;
const MIN_LENGTH = 2;
const MAX_LENGTH = 20;

/**
 * Client-side nickname validation.
 * @param {string} raw
 * @returns {{ valid: boolean, sanitized: string, error: string|null }}
 */
export function validateNickname(raw) {
  if (typeof raw !== 'string') {
    return { valid: false, sanitized: 'Player', error: null };
  }

  // Trim and collapse multiple spaces
  const sanitized = raw.trim().replace(/\s{2,}/g, ' ');

  if (sanitized.length === 0) {
    return { valid: false, sanitized: 'Player', error: null };
  }

  if (!NICKNAME_REGEX.test(sanitized)) {
    return { valid: false, sanitized, error: 'Only letters, numbers, spaces, _ . - allowed' };
  }

  if (sanitized.length < MIN_LENGTH) {
    return { valid: false, sanitized, error: 'Nickname must be at least 2 characters' };
  }

  if (sanitized.length > MAX_LENGTH) {
    return { valid: false, sanitized: sanitized.slice(0, MAX_LENGTH), error: 'Nickname must be 20 characters or less' };
  }

  return { valid: true, sanitized, error: null };
}
