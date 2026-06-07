import { describe, expect, it } from "vitest";
import { OfflineBuffer } from "./offline-buffer";

describe("edge offline buffer", () => {
  it("retains readings while dispatch fails and flushes after connectivity returns", async () => {
    const buffer = new OfflineBuffer<string>();
    buffer.append("reading-1");
    buffer.append("reading-2");

    const failed = await buffer.flush(async () => {
      throw new Error("offline");
    });

    expect(failed.sent).toBe(0);
    expect(failed.retained).toBe(2);
    expect(buffer.size()).toBe(2);

    const sent: string[] = [];
    const flushed = await buffer.flush(async (item) => {
      sent.push(item);
    });

    expect(flushed.sent).toBe(2);
    expect(flushed.retained).toBe(0);
    expect(sent).toEqual(["reading-1", "reading-2"]);
  });
});
