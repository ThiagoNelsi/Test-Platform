import { describe, expect, it } from "vitest";
import { trackingItem } from "./aws-adapters";

describe("batch tracking item", () => {
  it("stores each published batch with its pending status", () => {
    const item = trackingItem({
      document: "1/document.pdf",
      jobId: "job-1",
      batches: [
        { id: "batch-1", status: "pending" },
        { id: "batch-2", status: "pending" },
      ],
      totalBatches: 2,
      updatedAt: "2026-09-23T00:00:00.000Z",
    });

    expect(item.batches).toEqual({
      M: {
        "batch-1": { M: { status: { S: "pending" } } },
        "batch-2": { M: { status: { S: "pending" } } },
      },
    });
  });
});
