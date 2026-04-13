/**
 * Immutable template builder from tagged template literals.
 *
 * Usage:
 *   const t = templateBuilder`Rate quality: ${slot('spec')} ${slot('note', { optional: true })}`;
 *   const bound = t.set('spec', 'Use 1-10 scale');
 *   const text = bound.build();
 *
 * .set() and .setAll() return new instances — the original is never mutated.
 * .build() renders to string. Throws on unfilled required slots unless { partial: true }.
 * .slots returns a Map<name, { optional, filled }> for introspection.
 */

const SLOT_MARKER = Symbol('slot');

/**
 * Create a slot descriptor for use inside a templateBuilder tagged template.
 * @param {string} name - Slot name
 * @param {{ optional?: boolean }} [options]
 * @returns {object} Slot descriptor (recognized by templateBuilder)
 */
export function slot(name, { optional = false } = {}) {
  return { [SLOT_MARKER]: true, name, optional };
}

class TemplateBuilder {
  #parts;
  #slotDefs;
  #values;

  constructor(parts, slotDefs, values = {}) {
    this.#parts = parts;
    this.#slotDefs = slotDefs;
    this.#values = values;
  }

  set(name, value) {
    return new TemplateBuilder(this.#parts, this.#slotDefs, {
      ...this.#values,
      [name]: value,
    });
  }

  setAll(obj) {
    return new TemplateBuilder(this.#parts, this.#slotDefs, {
      ...this.#values,
      ...obj,
    });
  }

  build({ partial = false } = {}) {
    const result = [];
    for (let i = 0; i < this.#parts.length; i++) {
      result.push(this.#parts[i]);
      if (i < this.#slotDefs.length) {
        const def = this.#slotDefs[i];
        const value = this.#values[def.name];
        if (value !== undefined) {
          result.push(String(value));
        } else if (!def.optional && !partial) {
          throw new Error(`Required slot '${def.name}' has no value`);
        }
        // Optional unfilled or partial mode: slot becomes empty string (already nothing pushed)
      }
    }
    // Collapse runs of blank lines left by unfilled optional slots
    return result
      .join('')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  get slots() {
    const map = new Map();
    for (const def of this.#slotDefs) {
      map.set(def.name, {
        optional: def.optional,
        filled: this.#values[def.name] !== undefined,
      });
    }
    return map;
  }
}

/**
 * Tagged template literal function that creates an immutable TemplateBuilder.
 *
 * @param {TemplateStringsArray} strings
 * @param {...object} expressions - Must be slot() descriptors
 * @returns {TemplateBuilder}
 */
export default function templateBuilder(strings, ...expressions) {
  const parts = Array.from(strings);
  const slotDefs = expressions.map((expr, i) => {
    if (!expr?.[SLOT_MARKER]) {
      throw new Error(
        `templateBuilder expression ${i} must be a slot() descriptor, got ${typeof expr}`
      );
    }
    return { name: expr.name, optional: expr.optional };
  });
  return new TemplateBuilder(parts, slotDefs);
}
