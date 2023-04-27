import { describe, expect, it } from 'vitest';

import SummarizingMap from './index.js';

const legalText = `Pursuant to the stipulations delineated herein, the parties hereto, designated as Party A (the "Grantor") and Party B (the "Grantee"), do hereby irrevocably and unconditionally covenant to abide by the complex and intricate provisions associated with the lesser-known subject matter of usufructuary rights in the realm of riparian watercourses, specifically encompassing the doctrine of correlative rights and the principle of reasonable use, in accordance with the heretofore undisclosed specifications set forth in Schedule U-1.

In pursuance of the aforesaid stipulations, the Grantee shall obtain a non-exclusive, non-transferable, revocable license, subject to the limitations and conditions imposed by the pertinent jurisdictional authorities, to make equitable utilization of the watercourse, taking into account the natural flow, hydrological cycle, and ecological balance, while ensuring the avoidance of significant harm to other riparians by employing the best practicable means in conformity with the established standards of reasonableness, as delineated in the annexed Exhibit R-1, which sets forth the methodology for the determination of the equitable apportionment of said watercourse, and the allocation of the respective usufructuary rights.`;

const codeText = `
function _generateKey(seed, length) {
  let key = '';
  let curr = seed;
  for (let i = 0; i < length; i++) {
    curr = (1664525 * curr + 1013904223) % 4294967296;
    key += String.fromCharCode(curr % 256);
  }
  return key;
}

function _xorStrings(a, b) {
  let res = '';
  for (let i = 0; i < a.length; i++) {
    res += String.fromCharCode(a.charCodeAt(i) ^ b.charCodeAt(i));
  }
  return res;
}

function encodeDecode(input, seed) {
  let key = _generateKey(seed, input.length);
  return _xorStrings(input, key);
}
`;

describe('Summarizing map', () => {
  it('Example', async () => {
    const map = new SummarizingMap({ targetTokens: 100 });

    map.set('a.b.c', { value: legalText, weight: 0.2 });
    map.set('a.d', { value: codeText, weight: 0.7 });

    // console.log(await map.getAll())

    expect(1).toBe(1);
  });
});
