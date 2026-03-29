import { describe, it, expect } from 'vitest';
import createContentStore from './index.js';

describe('content-store', () => {
  it('stores and retrieves values', async () => {
    const store = createContentStore();
    await store.set('key1', 'value1');
    const result = await store.get('key1');
    expect(result).toBe('value1');
  });

  it('returns undefined for missing keys', async () => {
    const store = createContentStore();
    const result = await store.get('missing');
    expect(result).toBeUndefined();
  });

  it('checks key existence', async () => {
    const store = createContentStore();
    await store.set('exists', 'yes');
    expect(await store.has('exists')).toBe(true);
    expect(await store.has('missing')).toBe(false);
  });

  it('deletes keys', async () => {
    const store = createContentStore();
    await store.set('temp', 'data');
    expect(await store.has('temp')).toBe(true);
    await store.delete('temp');
    expect(await store.has('temp')).toBe(false);
  });

  it('reports size', async () => {
    const store = createContentStore();
    expect(store.size()).toBe(0);
    await store.set('a', '1');
    await store.set('b', '2');
    expect(store.size()).toBe(2);
  });

  it('clears all entries', async () => {
    const store = createContentStore();
    await store.set('a', '1');
    await store.set('b', '2');
    store.clear();
    expect(store.size()).toBe(0);
    expect(await store.get('a')).toBeUndefined();
  });

  it('overwrites existing keys', async () => {
    const store = createContentStore();
    await store.set('key', 'v1');
    await store.set('key', 'v2');
    expect(await store.get('key')).toBe('v2');
    expect(store.size()).toBe(1);
  });

  it('stores complex values', async () => {
    const store = createContentStore();
    const prompt = { messages: [{ role: 'user', content: 'hello' }] };
    await store.set('prompt:123', JSON.stringify(prompt));
    const retrieved = JSON.parse(await store.get('prompt:123'));
    expect(retrieved.messages[0].content).toBe('hello');
  });
});
