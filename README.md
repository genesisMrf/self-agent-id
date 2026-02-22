# Self Agent ID

Proof-of-human identity for AI agents on Celo.

- Live app (current): [https://self-agent-id.vercel.app/](https://self-agent-id.vercel.app/)
- Domain is deployment-specific; replace snippet URLs with your own host in production.

Self Agent ID lets developers prove an agent is backed by a unique human (via Self Protocol ZK proofs), then verify signed agent requests on-chain or in middleware.

## Who This Is For

1. Agent builders: register an agent and sign outbound requests.
2. API/service teams: verify incoming agent signatures and enforce policy (age, OFAC, sybil limits).
3. Protocol teams: gate smart contracts and compose with ERC-8004-style registry interfaces.

## What Is Implemented

- Four registration modes:
  - `Agent Identity` (recommended): dedicated agent keypair.
  - `Verified Wallet`: wallet address is the verified identity (human-operated on-chain flows).
  - `No Wallet`: wallet-free registration with generated agent keypair.
  - `Smart Wallet`: passkey-based guardian + dedicated agent keypair.
- SDKs:
  - TypeScript: `@selfxyz/agent-sdk`
  - Python: `selfxyz-agent-sdk` (import path: `self_agent_sdk`)
  - Rust: `self-agent-sdk`
- Public APIs:
  - `/api/cards/{chainId}/{agentId}`
  - `/api/reputation/{chainId}/{agentId}`
  - `/api/verify-status/{chainId}/{agentId}`
  - `/.well-known/a2a/{agentId}?chain={chainId}` (redirects to card resolver)

## Quick Start (Web App)

```bash
cd app
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Quick Integration (TypeScript)

Agent-side signing:

```ts
import { SelfAgent } from "@selfxyz/agent-sdk";

const agent = new SelfAgent({ privateKey: process.env.AGENT_PRIVATE_KEY! });
const res = await agent.fetch("https://api.example.com/protected", {
  method: "POST",
  body: JSON.stringify({ ping: true }),
});
```

Service-side verification:

```ts
import { SelfAgentVerifier } from "@selfxyz/agent-sdk";

const verifier = new SelfAgentVerifier({
  requireSelfProvider: true,
  maxAgentsPerHuman: 1,
});

app.use("/api", verifier.auth());
```

## Security Defaults

`SelfAgentVerifier` defaults are strict:

- `requireSelfProvider: true`
- `maxAgentsPerHuman: 1`
- replay protection + timestamp freshness checks enabled

If you set `requireSelfProvider: false`, you accept proofs from any provider configured in the registry.

## Network Configuration

Current defaults in `app/lib/network.ts`:

- Celo Mainnet (`42220`)
  - Registry: `0x62e37d0f6c5f67784b8828b3df68bcdbb2e55095`
- Celo Sepolia (`11142220`)
  - Registry: `0x42cea1b318557ade212bed74fc3c7f06ec52bd5b`

## Repo Layout

- `app/`: Next.js product site + APIs + demo flows
- `sdk/`: TypeScript SDK (`SelfAgent`, `SelfAgentVerifier`)
- `python-sdk/`: Python SDK
- `rust-sdk/`: Rust SDK
- `contracts/`: Solidity contracts (registry/providers/demo verifier)
- `functions/`: demo cloud functions

## Important Note on Smart Wallet Mode

Smart wallet mode manages guardian actions with passkeys, but agents still use their own ECDSA key for API request signing and EIP-712 demo contract flows.

## Integration Docs

1. `docs/SELF_PROTOCOL_INTEGRATION.md`
2. `docs/CLI_REGISTRATION_SPEC.md`
3. `docs/CLI_REGISTRATION_GUIDE.md`
