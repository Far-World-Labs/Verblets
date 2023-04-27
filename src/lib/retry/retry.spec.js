import { describe, expect, it } from "vitest";

import retry from "./index.js";

const retryDelayGlobal = 10;

const mockFn = async () => {
  return "Success";
};

describe("Retry", () => {
  it("Succeeds on first attempt", async () => {
    const result = await retry(mockFn);
    expect(result).toStrictEqual("Success");
  });

  it("Succeeds after retrying", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount += 1;
      if (callCount === 1) {
        const error = new Error("Error 429");
        error.response = { status: 429 };
        throw error;
      }
      return "Success";
    };

    const result = await retry(fn, { retryDelay: retryDelayGlobal });
    expect(result).toStrictEqual("Success");
  });

  it("Fails after maxRetries", async () => {
    const maxRetries = 2;
    let callCount = 0;

    const fn = async () => {
      callCount += 1;
      const error = new Error("Error 429");
      error.response = { status: 429 };
      throw error;
    };

    try {
      await retry(fn, { maxRetries, retryDelay: retryDelayGlobal });
    } catch (error) {
      expect(error.message).toStrictEqual("Max retries reached");
      expect(callCount).toStrictEqual(maxRetries);
    }
  });

  it("Throws non-retryable error", async () => {
    const mockFnWithOtherError = async () => {
      const error = new Error("Error 500");
      error.response = { status: 500 };
      throw error;
    };

    try {
      await retry(mockFnWithOtherError);
    } catch (error) {
      expect(error.message).toStrictEqual("Error 500");
      expect(error.response.status).toStrictEqual(500);
    }
  });
});
