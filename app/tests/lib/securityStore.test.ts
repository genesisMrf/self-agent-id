import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Memory mode tests ───────────────────────────────────────────────────────

describe("securityStore (memory mode)", () => {
  let securityStoreMode: typeof import("@/lib/securityStore").securityStoreMode;
  let setIfAbsentWithTtl: typeof import("@/lib/securityStore").setIfAbsentWithTtl;
  let incrementWithWindow: typeof import("@/lib/securityStore").incrementWithWindow;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    // Suppress the console.warn about missing Upstash config
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const mod = await import("@/lib/securityStore");
    securityStoreMode = mod.securityStoreMode;
    setIfAbsentWithTtl = mod.setIfAbsentWithTtl;
    incrementWithWindow = mod.incrementWithWindow;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("reports memory mode without env vars", () => {
    expect(securityStoreMode()).toBe("memory");
  });

  it("setIfAbsentWithTtl: first insert returns true", async () => {
    const result = await setIfAbsentWithTtl("mem-test-1", 60000);
    expect(result).toBe(true);
  });

  it("setIfAbsentWithTtl: duplicate returns false", async () => {
    await setIfAbsentWithTtl("mem-test-dup", 60000);
    const result = await setIfAbsentWithTtl("mem-test-dup", 60000);
    expect(result).toBe(false);
  });

  it("setIfAbsentWithTtl: TTL expiry allows re-insert", async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    await setIfAbsentWithTtl("mem-test-ttl", 100);
    expect(await setIfAbsentWithTtl("mem-test-ttl", 100)).toBe(false);

    vi.setSystemTime(now + 200);
    expect(await setIfAbsentWithTtl("mem-test-ttl", 100)).toBe(true);
  });

  it("incrementWithWindow: count increments", async () => {
    const first = await incrementWithWindow("mem-counter-1", 60000);
    expect(first.count).toBe(1);

    const second = await incrementWithWindow("mem-counter-1", 60000);
    expect(second.count).toBe(2);

    const third = await incrementWithWindow("mem-counter-1", 60000);
    expect(third.count).toBe(3);
  });

  it("incrementWithWindow: resets after window expires", async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    await incrementWithWindow("mem-counter-reset", 100);
    await incrementWithWindow("mem-counter-reset", 100);
    expect((await incrementWithWindow("mem-counter-reset", 100)).count).toBe(3);

    vi.setSystemTime(now + 200);
    const result = await incrementWithWindow("mem-counter-reset", 100);
    expect(result.count).toBe(1);
  });

  it("incrementWithWindow: ttlMs decreases over time", async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const first = await incrementWithWindow("mem-counter-ttl", 10000);
    expect(first.ttlMs).toBe(10000);

    vi.setSystemTime(now + 3000);
    const second = await incrementWithWindow("mem-counter-ttl", 10000);
    expect(second.ttlMs).toBeLessThanOrEqual(7000);
    expect(second.ttlMs).toBeGreaterThanOrEqual(6000);
  });

  it("setIfAbsentWithTtl: clamps ttlMs to at least 1", async () => {
    const result = await setIfAbsentWithTtl("mem-test-clamp", 0);
    expect(result).toBe(true);
  });
});

// ── Upstash mode tests ──────────────────────────────────────────────────────
// SECURITY_GAP: Finding #11 — non-atomic INCR+PEXPIRE in Upstash mode

describe("securityStore (upstash mode)", () => {
  let securityStoreMode: typeof import("@/lib/securityStore").securityStoreMode;
  let setIfAbsentWithTtl: typeof import("@/lib/securityStore").setIfAbsentWithTtl;
  let incrementWithWindow: typeof import("@/lib/securityStore").incrementWithWindow;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://fake-upstash.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fake-token");

    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const mod = await import("@/lib/securityStore");
    securityStoreMode = mod.securityStoreMode;
    setIfAbsentWithTtl = mod.setIfAbsentWithTtl;
    incrementWithWindow = mod.incrementWithWindow;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reports upstash mode with env vars", () => {
    expect(securityStoreMode()).toBe("upstash");
  });

  it("setIfAbsentWithTtl: returns true when Upstash responds OK", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ result: "OK" }), { status: 200 }),
    );

    const result = await setIfAbsentWithTtl("upstash-key-1", 5000);
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://fake-upstash.example.com",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(["SET", "upstash-key-1", "1", "NX", "PX", "5000"]),
      }),
    );
  });

  it("setIfAbsentWithTtl: returns false for duplicate (null result)", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ result: null }), { status: 200 }),
    );

    const result = await setIfAbsentWithTtl("upstash-key-dup", 5000);
    expect(result).toBe(false);
  });

  it("setIfAbsentWithTtl: falls back to memory on fetch failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network error"));

    // Should fall back to memory and succeed
    const result = await setIfAbsentWithTtl("upstash-fallback", 5000);
    expect(result).toBe(true);
  });

  it("incrementWithWindow: increments via Upstash commands", async () => {
    // INCR returns count
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ result: 1 }), { status: 200 }),
    );
    // PEXPIRE (called when count === 1)
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ result: 1 }), { status: 200 }),
    );
    // PTTL
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ result: 59000 }), { status: 200 }),
    );

    const result = await incrementWithWindow("upstash-counter", 60000);
    expect(result.count).toBe(1);
    expect(result.ttlMs).toBe(59000);
  });
});
