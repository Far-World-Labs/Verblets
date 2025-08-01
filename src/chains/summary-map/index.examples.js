import { describe, expect, it } from 'vitest';

import SummaryMap from './index.js';
import { longTestTimeout } from '../../constants/common.js';
import pave from '../../lib/pave/index.js';

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

describe('Summary map', () => {
  it.skipIf(process.env.PRIVACY_TEST_SKIP)(
    'Example',
    async () => {
      const map = new SummaryMap({
        targetTokens: 600,
      });

      map.set('a.b.c', {
        value: legalText,
        weight: 0.01,
        privacy: { blacklist: 'names and addresses' },
      });
      map.set('a.d', { value: codeText, type: 'code', weight: 0.7 });
      map.set('e.0', { value: 'abc', weight: 0.01 });
      map.set('e.3', {
        value: 'The quick brown fox jump over the lazy dog',
        weight: 0.7,
      });

      const entries = Array.from(await map.entries());
      const result = entries.reduce((acc, [k, v]) => pave(acc, k, v), {});

      expect(result).toBe(result);
    },
    longTestTimeout
  );
});
