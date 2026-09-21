import { describe, expect, it, vi } from "vitest";
import { createTextractResultLoader } from "./textract-results";

describe("Textract result loader", () => {
  it("loads every result page", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        Blocks: [{ Id: "page-1", BlockType: "PAGE" }],
        NextToken: "next",
      })
      .mockResolvedValueOnce({ Blocks: [{ Id: "page-2", BlockType: "PAGE" }] });
    const loadBlocks = createTextractResultLoader(fetchPage);

    await expect(loadBlocks("job-1")).resolves.toEqual([
      { Id: "page-1", BlockType: "PAGE" },
      { Id: "page-2", BlockType: "PAGE" },
    ]);
    expect(fetchPage).toHaveBeenNthCalledWith(1, "job-1", undefined);
    expect(fetchPage).toHaveBeenNthCalledWith(2, "job-1", "next");
  });

  it("fails when Textract repeats a pagination token", async () => {
    const loadBlocks = createTextractResultLoader(
      vi.fn().mockResolvedValue({ Blocks: [], NextToken: "same" }),
    );

    await expect(loadBlocks("job-1")).rejects.toThrow(
      "Textract returned a repeated pagination token for job job-1",
    );
  });
});
