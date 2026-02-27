import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSetIfAbsentWithTtl } = vi.hoisted(() => ({
  mockSetIfAbsentWithTtl: vi.fn(),
}));

vi.mock("@/lib/securityStore", () => ({
  setIfAbsentWithTtl: mockSetIfAbsentWithTtl,
}));

import { checkAndRecordReplay } from "@/lib/replayGuard";

describe("checkAndRecordReplay", () => {
  const baseParams = {
    signature: "0xsig123",
    timestamp: String(Date.now()),
    method: "POST",
    url: "https://example.com/api/demo/verify",
    body: '{"hello":"world"}',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetIfAbsentWithTtl.mockResolvedValue(true);
  });

  it("returns ok for first call", async () => {
    const result = await checkAndRecordReplay(baseParams);
    expect(result).toEqual({ ok: true });
    expect(mockSetIfAbsentWithTtl).toHaveBeenCalledOnce();
  });

  it("returns replay error when store returns false (duplicate)", async () => {
    mockSetIfAbsentWithTtl.mockResolvedValue(false);
    const result = await checkAndRecordReplay(baseParams);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Replay detected");
  });

  it("rejects invalid (non-numeric) timestamp", async () => {
    const result = await checkAndRecordReplay({
      ...baseParams,
      timestamp: "not-a-number",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Invalid timestamp");
    expect(mockSetIfAbsentWithTtl).not.toHaveBeenCalled();
  });

  it("produces deterministic keys for full URLs vs path-only", async () => {
    const calls: string[] = [];
    mockSetIfAbsentWithTtl.mockImplementation((key: string) => {
      calls.push(key);
      return Promise.resolve(true);
    });

    // Full URL
    await checkAndRecordReplay({
      ...baseParams,
      url: "https://example.com/api/demo/verify?q=1",
    });
    // Path-only equivalent
    await checkAndRecordReplay({
      ...baseParams,
      url: "/api/demo/verify?q=1",
    });

    // Both should produce the same key because canonicalization strips the origin
    expect(calls[0]).toBe(calls[1]);
  });

  it("query-only URL is canonicalized with leading slash", async () => {
    const calls: string[] = [];
    mockSetIfAbsentWithTtl.mockImplementation((key: string) => {
      calls.push(key);
      return Promise.resolve(true);
    });

    await checkAndRecordReplay({
      ...baseParams,
      url: "?q=1",
    });

    // Key should contain the canonicalized path
    expect(calls[0]).toMatch(/^replay:/);
  });

  it("uses custom scope in key prefix", async () => {
    const calls: string[] = [];
    mockSetIfAbsentWithTtl.mockImplementation((key: string) => {
      calls.push(key);
      return Promise.resolve(true);
    });

    await checkAndRecordReplay({
      ...baseParams,
      scope: "custom-scope",
    });

    expect(calls[0]).toContain("custom-scope");
    expect(calls[0]).not.toContain(":self:");
  });

  it("TTL is clamped to at least 1", async () => {
    // Set timestamp far in the past so ts + maxAgeMs - now would be <= 0
    await checkAndRecordReplay({
      ...baseParams,
      timestamp: "1000000000000", // way in the past
      maxAgeMs: 1,
    });

    const ttlArg = mockSetIfAbsentWithTtl.mock.calls[0][1];
    expect(ttlArg).toBeGreaterThanOrEqual(1);
  });

  it("uses default scope 'self' when not specified", async () => {
    const calls: string[] = [];
    mockSetIfAbsentWithTtl.mockImplementation((key: string) => {
      calls.push(key);
      return Promise.resolve(true);
    });

    await checkAndRecordReplay(baseParams);

    expect(calls[0]).toMatch(/^replay:self:/);
  });
});
