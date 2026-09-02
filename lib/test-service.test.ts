import type { OwnedTestsResponse } from "api-contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { backendJson } from "./backend-api";
import { getOwnedTests } from "./test-service";

vi.mock("./backend-api", () => ({
  backendJson: vi.fn(),
}));

const backendJsonMock = vi.mocked(backendJson);

describe("test service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the browser session cookie when listing owned tests", async () => {
    backendJsonMock.mockResolvedValue({ tests: [] } satisfies OwnedTestsResponse);

    await expect(getOwnedTests()).resolves.toEqual([]);

    expect(backendJsonMock).toHaveBeenCalledWith("/api/tests");
  });
});
