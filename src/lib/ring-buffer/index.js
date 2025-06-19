/**
 * Simple ring buffer that evicts the oldest entries when full.
 * Useful for maintaining a fixed-size history without large memory usage.
 */
export default class RingBuffer {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.buffer = [];
  }

  /**
   * Add an item to the buffer.
   * @param {any} item Item to store.
   * @returns {any} The stored item.
   */
  push(item) {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift();
    }
    this.buffer.push(item);
    return item;
  }

  /**
   * Remove all items from the buffer.
   */
  clear() {
    this.buffer.length = 0;
  }

  /**
   * Current number of items in the buffer.
   * @returns {number}
   */
  size() {
    return this.buffer.length;
  }

  /**
   * Maximum capacity of the buffer.
   * @returns {number}
   */
  capacity() {
    return this.maxSize;
  }

  /**
   * Whether the buffer has reached its capacity.
   * @returns {boolean}
   */
  isFull() {
    return this.buffer.length >= this.maxSize;
  }

  /**
   * Get a copy of all items in the buffer.
   * Oldest items appear first.
   * @returns {any[]}
   */
  all() {
    return [...this.buffer];
  }

  /**
   * Get the first `count` items.
   * @param {number} count Number of items.
   * @returns {any[]}
   */
  head(count) {
    return this.buffer.slice(0, count);
  }

  /**
   * Get the last `count` items.
   * @param {number} count Number of items.
   * @returns {any[]}
   */
  tail(count) {
    return this.buffer.slice(-count);
  }

  /**
   * Filter items in the buffer using the given predicate.
   * @param {Function} predicate
   * @returns {any[]}
   */
  filter(predicate) {
    return this.buffer.filter(predicate);
  }

  /**
   * Iterate over items in insertion order.
   */
  [Symbol.iterator]() {
    return this.buffer[Symbol.iterator]();
  }
}
