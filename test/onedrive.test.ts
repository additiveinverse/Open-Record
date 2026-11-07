import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
vi.mock("@aws-sdk/client-ssm", () => ({
  SSMClient: class {
    send = send;
  },
  GetParameterCommand: class {
    constructor(public input: { Name: string }) {}
  },
  PutParameterCommand: class {
    constructor(public input: { Name: string; Value: string }) {}
  },
}));

import { resetTokenCache, uploadRecord } from "../src/onedrive";

describe("uploadRecord", () => {
  beforeEach(() => {
    resetTokenCache();
    send.mockReset();
    send.mockImplementation(async (cmd: { input: { Name: string } }) =>
      cmd.input.Name.endsWith("client-id")
        ? { Parameter: { Value: "cid" } }
        : { Parameter: { Value: "old-refresh" } },
    );
  });

  it("refreshes the token, stores the rotated one, and PUTs the file", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "at", refresh_token: "new-refresh", expires_in: 3600 }),
        ),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await uploadRecord("Records/2026/11/2026-11-03-001244.md", "hi");

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toContain("/root:/Records/2026/11/2026-11-03-001244.md:/content");
    expect(init.headers.Authorization).toBe("Bearer at");
    const put = send.mock.calls.map((c) => c[0].input).find((i) => i.Value === "new-refresh");
    expect(put.Name).toBe("/open-record/onedrive/refresh-token");
  });

  it("throws when the upload fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "at", expires_in: 3600 })))
        .mockResolvedValueOnce(new Response("nope", { status: 500 })),
    );
    await expect(uploadRecord("Records/x.md", "hi")).rejects.toThrow("upload failed: 500");
  });
});
