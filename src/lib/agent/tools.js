/**
 * Tool vocabulary for callAgent.
 *
 * Maps abstract tool categories to backend-specific tool names.
 * Consumers use the abstract names; backends translate.
 */

export const TOOL_CATEGORIES = ['read', 'write', 'edit', 'search', 'glob', 'bash', 'git'];

export const DEFAULT_TOOLS = ['read', 'write', 'edit', 'search', 'glob', 'bash'];

export function mapAllowedTools(value) {
  if (value === 'all') return TOOL_CATEGORIES;
  if (value === 'readonly') return ['read', 'search', 'glob'];
  if (value === 'safe') return DEFAULT_TOOLS;
  return value;
}
