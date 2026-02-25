// app/lib/mcp/config.ts

import { NETWORKS } from "@selfxyz/agent-sdk";
import type { NetworkName } from "@selfxyz/agent-sdk";

export interface McpConfig {
  privateKey: string | undefined;
  network: NetworkName;
  rpcUrl: string;
  apiUrl: string;
  registryAddress: string;
}

function parseNetwork(value: string | undefined): NetworkName {
  if (!value || value === "testnet") return "testnet";
  if (value === "mainnet") return "mainnet";
  throw new Error(
    `Invalid SELF_NETWORK: "${value}". Expected "mainnet" or "testnet".`,
  );
}

export function loadMcpConfig(): McpConfig {
  const network = parseNetwork(process.env.SELF_NETWORK);
  const networkConfig = NETWORKS[network];
  const apiUrl =
    process.env.SELF_AGENT_API_BASE ||
    "https://self-agent-id.vercel.app";

  return {
    privateKey: process.env.SELF_AGENT_PRIVATE_KEY || undefined,
    network,
    rpcUrl: process.env.SELF_RPC_URL || networkConfig.rpcUrl,
    apiUrl: apiUrl.replace(/\/+$/, ""),
    registryAddress: networkConfig.registryAddress,
  };
}
