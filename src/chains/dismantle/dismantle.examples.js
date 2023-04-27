import { describe, expect, it } from "vitest";

import Dismantle from "./index.js";
import { longTestTimeout } from "../../constants/common.js";

describe("Dismantle verblet", () => {
  it(
    "2022 Aprilia Tuono 660",
    async () => {
      const dismantleBike = new Dismantle("2022 Aprilia Tuono 660", {
        enhanceFixes: `
 - IMPORTANT If the component is "Electronics", output empty results.
 - If the component is "Dashboard", output empty results.
`,
      });
      await dismantleBike.makeSubtree({ depth: 1 });
      await dismantleBike.attachSubtree({
        depth: 1,
        find: (node) => node.name === "Fuel Injector",
      });
      await dismantleBike.attachSubtree({
        depth: 1,
        find: (node) => node.name === "Exhaust System",
      });

      expect(true).toStrictEqual(true);
    },
    longTestTimeout
  );
});
