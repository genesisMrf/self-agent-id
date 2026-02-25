import { beforeEach, describe, expect, it, vi } from "vitest";

const registeredTools: string[] = [];
const registeredResources: string[] = [];
const registeredPrompts: string[] = [];
const handlerMock = vi.fn(async () => new Response("mcp-ok", { status: 200 }));
const createMcpHandlerMock = vi.fn(
  (
    register: (server: {
      tool: (...args: unknown[]) => void;
      resource: (...args: unknown[]) => void;
      prompt: (...args: unknown[]) => void;
    }) => void,
  ) => {
    registeredTools.length = 0;
    registeredResources.length = 0;
    registeredPrompts.length = 0;

    register({
      tool: (name: unknown) => {
        registeredTools.push(String(name));
      },
      resource: (name: unknown) => {
        registeredResources.push(String(name));
      },
      prompt: (name: unknown) => {
        registeredPrompts.push(String(name));
      },
    });
    return handlerMock;
  },
);

async function loadRoute() {
  vi.resetModules();
  handlerMock.mockClear();
  createMcpHandlerMock.mockClear();

  vi.doMock("mcp-handler", () => ({
    createMcpHandler: createMcpHandlerMock,
  }));

  vi.doMock("@/lib/mcp/config", () => ({
    loadMcpConfig: () => ({
      network: "testnet",
      rpcUrl: "https://rpc.example",
      privateKey: undefined,
    }),
  }));

  vi.doMock("@selfxyz/agent-sdk", () => ({
    NETWORKS: {
      mainnet: {
        registryAddress: "0xmain",
        rpcUrl: "https://mainnet-rpc.example",
      },
      testnet: {
        registryAddress: "0xtest",
        rpcUrl: "https://testnet-rpc.example",
      },
    },
  }));

  vi.doMock("@/lib/mcp/handlers/discovery", () => ({
    handleLookupAgent: vi.fn(async () => ({ ok: true })),
    handleListAgentsForHuman: vi.fn(async () => ({ ok: true })),
  }));
  vi.doMock("@/lib/mcp/handlers/identity", () => ({
    handleGetIdentity: vi.fn(async () => ({ ok: true })),
    handleRegisterAgent: vi.fn(async () => ({ ok: true })),
    handleCheckRegistration: vi.fn(async () => ({ ok: true })),
    handleDeregisterAgent: vi.fn(async () => ({ ok: true })),
  }));
  vi.doMock("@/lib/mcp/handlers/auth", () => ({
    handleSignRequest: vi.fn(async () => ({ ok: true })),
    handleAuthenticatedFetch: vi.fn(async () => ({ ok: true })),
  }));
  vi.doMock("@/lib/mcp/handlers/verify", () => ({
    handleVerifyAgent: vi.fn(async () => ({ ok: true })),
    handleVerifyRequest: vi.fn(async () => ({ ok: true })),
  }));

  return import("@/app/api/mcp/route");
}

describe("MCP route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers all MCP tools/resources/prompts with expected handler config", async () => {
    await loadRoute();

    expect(createMcpHandlerMock).toHaveBeenCalledTimes(1);
    expect(createMcpHandlerMock.mock.calls[0]?.[2]).toEqual({
      basePath: "/api",
      maxDuration: 60,
    });

    expect(registeredTools).toEqual([
      "self_lookup_agent",
      "self_list_agents_for_human",
      "self_get_identity",
      "self_register_agent",
      "self_check_registration",
      "self_deregister_agent",
      "self_sign_request",
      "self_authenticated_fetch",
      "self_verify_agent",
      "self_verify_request",
    ]);
    expect(registeredResources).toEqual(["self-networks", "self-identity"]);
    expect(registeredPrompts).toEqual(["self_integrate_verification"]);
  });

  it("exports GET/POST/DELETE bound to the MCP transport handler", async () => {
    const mod = await loadRoute();

    expect(mod.GET).toBe(handlerMock);
    expect(mod.POST).toBe(handlerMock);
    expect(mod.DELETE).toBe(handlerMock);

    const res = await mod.GET(new Request("https://example.com/api/mcp"));
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe("mcp-ok");
    expect(handlerMock).toHaveBeenCalledTimes(1);
  });
});
