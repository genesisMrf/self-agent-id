"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center p-8 gap-12 font-[family-name:var(--font-inter)]">
      {/* Hero */}
      <div className="text-center max-w-2xl mt-16">
        <h1 className="text-4xl font-bold mb-4">Self Agent ID</h1>
        <p className="text-lg text-gray-700 mb-8">
          Register AI agents with on-chain proof-of-human verification via Self
          Protocol. Prove your agent is backed by a real, unique human.
        </p>
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/register"
          className="px-8 py-4 bg-black text-white rounded-lg text-lg font-medium hover:bg-gray-800 transition-colors text-center"
        >
          Register Agent
        </Link>
        <Link
          href="/my-agents"
          className="px-8 py-4 border-2 border-black rounded-lg text-lg font-medium hover:bg-gray-100 transition-colors text-center"
        >
          My Agents
        </Link>
        <Link
          href="/verify"
          className="px-8 py-4 border-2 border-black rounded-lg text-lg font-medium hover:bg-gray-100 transition-colors text-center"
        >
          Verify Agent
        </Link>
        <Link
          href="/explainer"
          className="px-8 py-4 border-2 border-gray-600 text-gray-700 rounded-lg text-lg font-medium hover:bg-gray-100 transition-colors text-center"
        >
          EIP-8004 Proposal
        </Link>
      </div>

      {/* How It Works */}
      <div className="w-full max-w-4xl mt-4">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Agent Operator Flow */}
          <div className="border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-1">For Agent Operators</h3>
            <p className="text-sm text-gray-500 mb-5">
              Register your AI agent so services trust it
            </p>

            <ol className="space-y-4">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
                  1
                </span>
                <div>
                  <p className="font-medium text-sm">Connect wallet</p>
                  <p className="text-xs text-gray-500">
                    Open the app and connect your browser wallet (MetaMask, etc.)
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
                  2
                </span>
                <div>
                  <p className="font-medium text-sm">Choose identity mode</p>
                  <p className="text-xs text-gray-500">
                    <strong>Agent Identity</strong> &mdash; agent gets its own
                    keypair and operates independently.{" "}
                    <strong>Verified Wallet</strong> &mdash; your wallet address
                    is the agent identity (for on-chain gating).
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
                  3
                </span>
                <div>
                  <p className="font-medium text-sm">Scan with Self app</p>
                  <p className="text-xs text-gray-500">
                    Scan the QR code with the Self app on your phone. A ZK proof
                    of your passport is generated &mdash; no personal data is
                    shared, only a unique human nullifier.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
                  4
                </span>
                <div>
                  <p className="font-medium text-sm">Agent is registered</p>
                  <p className="text-xs text-gray-500">
                    An NFT is minted on-chain binding your agent key to a
                    verified human. For Agent Identity mode, save the private key
                    &mdash; give it to your agent software.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
                  5
                </span>
                <div>
                  <p className="font-medium text-sm">Agent signs requests</p>
                  <p className="text-xs text-gray-500">
                    Your agent uses the SDK to automatically sign every outgoing
                    request. Services verify the signature and check the on-chain
                    registry.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Integration Partner Flow */}
          <div className="border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-1">For Integration Partners</h3>
            <p className="text-sm text-gray-500 mb-5">
              Verify that agents calling your service are human-backed
            </p>

            <ol className="space-y-4">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
                  1
                </span>
                <div>
                  <p className="font-medium text-sm">Install the SDK</p>
                  <p className="text-xs text-gray-500">
                    <code className="bg-gray-100 px-1 rounded">
                      npm install @selfxyz/agent-sdk
                    </code>{" "}
                    &mdash; or implement verification manually in any language
                    using the on-chain registry.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
                  2
                </span>
                <div>
                  <p className="font-medium text-sm">Add middleware</p>
                  <p className="text-xs text-gray-500">
                    One line for Express:{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      app.use(verifier.expressMiddleware())
                    </code>
                    . For other frameworks, call{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      verifier.verify()
                    </code>{" "}
                    directly.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
                  3
                </span>
                <div>
                  <p className="font-medium text-sm">Requests are verified</p>
                  <p className="text-xs text-gray-500">
                    The SDK recovers the signer from the ECDSA signature, derives
                    the on-chain agent key, and checks{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      isVerifiedAgent()
                    </code>{" "}
                    on the registry contract.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
                  4
                </span>
                <div>
                  <p className="font-medium text-sm">Sybil resistant by default</p>
                  <p className="text-xs text-gray-500">
                    The SDK enforces 1 agent per human automatically. Each
                    human&apos;s passport generates a unique nullifier &mdash;
                    using multiple wallets doesn&apos;t bypass the limit.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
                  5
                </span>
                <div>
                  <p className="font-medium text-sm">On-chain gating (optional)</p>
                  <p className="text-xs text-gray-500">
                    Smart contracts can verify agents directly via{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      msg.sender
                    </code>
                    . Add an{" "}
                    <code className="bg-gray-100 px-1 rounded">
                      onlyVerifiedAgent
                    </code>{" "}
                    modifier &mdash; no off-chain component needed.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>

        {/* Visual flow diagram */}
        <div className="mt-8 border border-gray-200 rounded-xl p-6 bg-gray-50">
          <h3 className="text-sm font-bold text-center mb-4 text-gray-600 uppercase tracking-wide">
            Verification Flow
          </h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-center">
            <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium">
              Agent signs request
            </div>
            <span className="text-gray-400 hidden sm:block">&rarr;</span>
            <span className="text-gray-400 sm:hidden">&darr;</span>
            <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium">
              Service recovers signer
            </div>
            <span className="text-gray-400 hidden sm:block">&rarr;</span>
            <span className="text-gray-400 sm:hidden">&darr;</span>
            <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium">
              Checks on-chain registry
            </div>
            <span className="text-gray-400 hidden sm:block">&rarr;</span>
            <span className="text-gray-400 sm:hidden">&darr;</span>
            <div className="px-4 py-2 bg-green-50 border border-green-300 rounded-lg font-medium text-green-700">
              Verified human-backed
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
