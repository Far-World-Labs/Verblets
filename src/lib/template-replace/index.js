/**
 * Simple template replacement utility
 * Replaces {key} placeholders with values from data object
 *
 * @param {string} template - Template string with {key} placeholders
 * @param {object} data - Data object with key-value pairs
 * @param {string} [missingValue=''] - Fallback value for placeholders with no mapping
 * @returns {string} - Template with placeholders replaced
 */
export default function templateReplace(template, data, missingValue = '') {
  if (!template || typeof template !== 'string') {
    return template || '';
  }

  if (data === undefined || data === null || typeof data !== 'object') {
    return template;
  }

  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    const value = data[key];
    return String(value != null ? value : missingValue);
  });
}
