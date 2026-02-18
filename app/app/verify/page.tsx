"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ethers } from "ethers";
import Link from "next/link";
import { REGISTRY_ADDRESS, REGISTRY_ABI, RPC_URL } from "@/lib/constants";

interface AgentInfo {
  isVerified: boolean;
  agentId: bigint;
  nullifier: bigint;
  agentCount: bigint;
  owner: string;
  registeredAt: bigint;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const [agentKey, setAgentKey] = useState(searchParams.get("key") || "");
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookupAgent = useCallback(async (key: string) => {
    if (!key) return;
    setLoading(true);
    setError("");
    setAgentInfo(null);

    try {
      let keyHash: string;
      if (key.startsWith("0x") && key.length === 66) {
        keyHash = key;
      } else {
        keyHash = ethers.keccak256(ethers.toUtf8Bytes(key));
      }

      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(
        REGISTRY_ADDRESS,
        REGISTRY_ABI,
        provider
      );

      const isVerified = await contract.isVerifiedAgent(keyHash);
      const agentId = await contract.getAgentId(keyHash);

      if (agentId === 0n) {
        setAgentInfo({
          isVerified: false,
          agentId: 0n,
          nullifier: 0n,
          agentCount: 0n,
          owner: ethers.ZeroAddress,
          registeredAt: 0n,
        });
      } else {
        const nullifier = await contract.getHumanNullifier(agentId);
        const agentCount = await contract.getAgentCountForHuman(nullifier);
        const owner = await contract.ownerOf(agentId);
        const registeredAt = await contract.agentRegisteredAt(agentId);

        setAgentInfo({
          isVerified,
          agentId,
          nullifier,
          agentCount,
          owner,
          registeredAt,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to query contract"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const key = searchParams.get("key");
    if (key) {
      setAgentKey(key);
      lookupAgent(key);
    }
  }, [searchParams, lookupAgent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookupAgent(agentKey);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full max-w-md flex gap-2">
        <input
          type="text"
          value={agentKey}
          onChange={(e) => setAgentKey(e.target.value)}
          placeholder="Agent public key or identifier"
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          type="submit"
          disabled={loading || !agentKey}
          className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-300"
        >
          {loading ? "..." : "Check"}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {agentInfo && (
        <div className="w-full max-w-md border rounded-lg p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-3 h-3 rounded-full ${agentInfo.isVerified ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="font-medium text-lg">
              {agentInfo.agentId === 0n
                ? "Not Registered"
                : agentInfo.isVerified
                  ? "Verified"
                  : "Revoked"}
            </span>
          </div>

          {agentInfo.agentId > 0n && (
            <div className="text-sm space-y-1 text-gray-600">
              <p>
                <span className="font-medium text-black">Agent ID:</span>{" "}
                {agentInfo.agentId.toString()}
              </p>
              <p>
                <span className="font-medium text-black">Owner:</span>{" "}
                {agentInfo.owner.slice(0, 6)}...{agentInfo.owner.slice(-4)}
              </p>
              <p>
                <span className="font-medium text-black">
                  Human&apos;s agents:
                </span>{" "}
                {agentInfo.agentCount.toString()}
              </p>
              <p>
                <span className="font-medium text-black">
                  Registered at block:
                </span>{" "}
                {agentInfo.registeredAt.toString()}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function VerifyPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-6 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-3xl font-bold">Verify Agent</h1>
      <p className="text-gray-600 text-center max-w-md">
        Check if an AI agent is registered and backed by a verified human.
      </p>

      <Suspense
        fallback={
          <div className="w-full max-w-md h-12 bg-gray-200 animate-pulse rounded-lg" />
        }
      >
        <VerifyContent />
      </Suspense>

      <Link
        href="/"
        className="text-sm text-gray-500 hover:text-gray-800 underline"
      >
        Back to home
      </Link>
    </main>
  );
}
