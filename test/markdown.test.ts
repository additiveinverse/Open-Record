import { describe, expect, it } from "vitest";
import { buildMarkdown, recordPath } from "../src/markdown";
import { pick } from "../src/phrases";

const date = new Date("2026-11-03T06:12:44Z");

describe("markdown", () => {
  it("builds a flat path in local time", () => {
    expect(recordPath(date, "America/Chicago")).toBe("Documents/OpenRecord/2026-11-03T001244.md");
  });

  it("builds front matter with topic and tags", () => {
    const md = buildMarkdown({
      date,
      timeZone: "America/Chicago",
      device: "Kitchen Echo",
      text: " hello ",
      topic: "chickens as food",
      tags: ["VeganAF", "food sources", "veganaf"],
      id: "34d87cc6",
    });
    expect(md).toBe(
      "---\nid: 34d87cc6\ntopic: chickens as food\ntags:\n  - veganaf\n  - food-sources\n" +
        "created: 2026-11-03T00:12:44\nsource: Alexa\ndevice: Kitchen Echo\n---\n\nhello\n\n[[chickens as food]]\n",
    );
  });

  it("defaults topic to Inbox and tags to empty", () => {
    const md = buildMarkdown({ date, timeZone: "America/Chicago", device: "d", text: "x", id: "abcd1234" });
    expect(md).toContain("topic: Inbox\ntags: []\n");
  });

  it("quotes unsafe YAML values", () => {
    const md = buildMarkdown({ date, timeZone: "America/Chicago", device: "d", text: "x", topic: "a: b", id: "abcd1234" });
    expect(md).toContain('topic: "a: b"');
  });
});

describe("pick", () => {
  it("selects by rng", () => {
    expect(pick(["a", "b", "c"], () => 0.99)).toBe("c");
  });
});
