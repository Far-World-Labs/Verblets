/**
 * Tool vocabulary for callAgent.
 *
 * Maps abstract tool categories to backend-specific tool names.
 * Consumers use the abstract names; backends translate.
 */

export const TOOL_CATEGORIES = ['read', 'write', 'edit', 'search', 'glob', 'bash', 'git'];

export const DEFAULT_TOOLS = ['read', 'write', 'edit', 'search', 'glob', 'bash'];

export function mapAllowedTools(value) {
  if (value === undefined) return DEFAULT_TOOLS;
  if (value === 'all') return TOOL_CATEGORIES;
  if (value === 'readonly') return ['read', 'search', 'glob'];
  if (value === 'safe') return DEFAULT_TOOLS;
  if (!Array.isArray(value)) {
    throw new Error(
      `allowedTools: expected an array, 'all', 'readonly', or 'safe'; got ${typeof value}`
    );
  }
  if (value.length === 0) {
    throw new Error(
      `allowedTools: empty array is not supported (omit to use defaults, or pass 'readonly' for no-write access)`
    );
  }
  const unknown = value.filter((v) => !TOOL_CATEGORIES.includes(v));
  if (unknown.length > 0) {
    throw new Error(
      `allowedTools: unknown categor${unknown.length === 1 ? 'y' : 'ies'}: ${unknown.join(', ')}`
    );
  }
  return value;
}
