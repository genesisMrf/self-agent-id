"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import { connectWallet } from "@/lib/wallet";
import { REGISTRY_ADDRESS, REGISTRY_ABI, RPC_URL } from "@/lib/constants";

interface AgentEntry {
  agentId: bigint;
  agentKey: string;
  agentAddress: string;
  isVerified: boolean;
  registeredAt: bigint;
  isSimpleMode: boolean;
}

export default function MyAgentsPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    setError("");
    const address = await connectWallet();
    if (!address) return;
    setWalletAddress(address);
    await loadAgents(address);
  };

  const loadAgents = async (ownerAddress: string) => {
    setLoading(true);
    setError("");
    setAgents([]);

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const registry = new ethers.Contract(
        REGISTRY_ADDRESS,
        REGISTRY_ABI,
        provider
      );

      // Query Transfer events where `to` is the connected wallet (mints)
      const mintFilter = registry.filters.Transfer(null, ownerAddress);
      const mintEvents = await registry.queryFilter(mintFilter, 0, "latest");

      const results: AgentEntry[] = [];

      for (const event of mintEvents) {
        const log = event as ethers.EventLog;
        const agentId = log.args[2] as bigint;

        try {
          // Check if this agent is still owned by the wallet (not burned/transferred)
          const currentOwner: string = await registry.ownerOf(agentId);
          if (currentOwner.toLowerCase() !== ownerAddress.toLowerCase()) continue;

          const agentKey: string = await registry.agentIdToPubkey(agentId);
          const isVerified: boolean = await registry.isVerifiedAgent(agentKey);
          const registeredAt: bigint = await registry.agentRegisteredAt(agentId);

          // Extract address from bytes32 key (last 20 bytes)
          const agentAddress = "0x" + agentKey.slice(26);
          const isSimpleMode =
            agentAddress.toLowerCase() === ownerAddress.toLowerCase();

          results.push({
            agentId,
            agentKey,
            agentAddress,
            isVerified,
            registeredAt,
            isSimpleMode,
          });
        } catch {
          // Token was burned — skip
        }
      }

      setAgents(results);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load agents"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-6 font-[family-name:var(--font-inter)]">
      <h1 className="text-3xl font-bold">My Agents</h1>
      <p className="text-gray-700 text-center max-w-md">
        Connect your wallet to see all agents registered to your address.
      </p>

      {!walletAddress ? (
        <button
          onClick={handleConnect}
          className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="w-full max-w-lg space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Connected:{" "}
              <span className="font-mono text-black">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </p>
            <button
              onClick={() => loadAgents(walletAddress)}
              disabled={loading}
              className="text-sm text-black underline hover:text-gray-600 disabled:text-gray-400"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {loading && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Scanning for agents...</p>
            </div>
          )}

          {!loading && agents.length === 0 && walletAddress && (
            <div className="text-center py-8 border border-gray-200 rounded-lg">
              <p className="text-gray-500 mb-4">No agents found for this wallet.</p>
              <Link
                href="/register"
                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Register an Agent
              </Link>
            </div>
          )}

          {agents.map((agent) => (
            <Link
              key={agent.agentId.toString()}
              href={`/verify?key=${encodeURIComponent(agent.agentKey)}`}
              className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      agent.isVerified ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="font-medium text-black">
                    Agent #{agent.agentId.toString()}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      agent.isSimpleMode
                        ? "bg-gray-100 text-gray-600"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {agent.isSimpleMode ? "Verified Wallet" : "Agent Identity"}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {agent.isVerified ? "Verified" : "Revoked"}
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500">
                  {agent.isSimpleMode ? "Wallet" : "Agent"} Address
                </p>
                <p className="font-mono text-sm text-black break-all">
                  {agent.agentAddress}
                </p>
              </div>

              {agent.registeredAt > 0n && (
                <p className="text-xs text-gray-400 mt-2">
                  Registered at block {agent.registeredAt.toString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      <Link
        href="/"
        className="text-sm text-gray-600 hover:text-gray-800 underline"
      >
        Back to home
      </Link>
    </main>
  );
}
