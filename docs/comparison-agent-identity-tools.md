# Agent Identity Verification: Landscape Analysis

An honest assessment of Self Agent ID's position relative to other tools in the
ERC-8004 agent identity space, written February 2026.

---

## The Problem

AI agents are increasingly autonomous: they hold wallets, sign transactions, call
APIs, and transact with other agents. But there's no native way to know whether an
agent is backed by a real human, or whether two agents share the same human operator.
ERC-8004 (Trustless Agents) emerged to address this with three registries: Identity,
Reputation, and Validation.

## Self Agent ID

**What it is:** An ERC-8004 proof-of-human extension that binds AI agent identities
to Self Protocol ZK passport proofs. Agents get soulbound NFTs proving a verified
human registered them.

**Chain:** Celo (mainnet + Sepolia testnet)

**Verification:** Self Protocol Hub V2 -- NFC passport scan with ZK proofs. The
passport data never leaves the device; only the proof goes on-chain. 180+ countries
supported.

**Key features:**
- 3 registration modes: simple (wallet=agent), advanced (separate agent keypair),
  wallet-free (agent-owned NFT via smart account + passkeys)
- On-chain sybil cap (configurable max agents per human, default 1)
- ZK-attested credential storage (nationality, age threshold, OFAC status)
- Soulbound NFTs (non-transferable)
- Guardian system for human-controlled agent revocation
- SDK with ECDSA request signing + Express middleware
- Multi-config verification (6 age x OFAC combinations)
- Gasless operations via account abstraction (ZeroDev Kernel + Pimlico)

**Strengths:**
- Deep integration with Self Protocol's mature ZK infrastructure
- Multiple registration modes for different agent architectures
- On-chain sybil resistance (contract-level, not just SDK-level)
- Comprehensive SDK for both agent-side and verifier-side
- Chain-bound signatures prevent cross-chain replay attacks
- Guardian revocation gives humans a kill switch for compromised agents

**Weaknesses:**
- Single chain (Celo only) -- no cross-chain agent portability
- PII stored on-chain (name, passport number, DOB in credential storage).
  Even though data is from ZK disclosure proofs, it's publicly readable via
  `getAgentCredentials()`. This is a known trade-off documented in the security
  audit. Future versions should store only `olderThan`/`ofac`/`nationality`.
- No built-in agent economy (no marketplace, no token, no reputation system)
- No agent-to-agent communication protocol
- Smaller ecosystem -- purpose-built for Self Protocol integration

## SelfClaw

**What it is:** A full-stack agent verification + economy platform built on
Self.xyz proofs with ERC-8004 identity.

**Chain:** Celo (primary), Base (via Wormhole bridge for $SELFCLAW token)

**Verification:** Same Self.xyz ZK passport proofs as Self Agent ID. Ed25519
keypairs for agent signatures (vs ECDSA in Self Agent ID).

**Key features:**
- 6-stage agent lifecycle: Verify -> Wallet -> Gas -> ERC-8004 -> Token -> Sponsorship
- Agent token deployment (each agent can mint its own ERC-20)
- Skill marketplace with escrow-based commerce protocol
- Reputation staking with peer review
- Miniclaws (hosted conversational agents with persistent memory)
- Gas subsidies for verified agents
- Sponsored liquidity pools via Uniswap V3/V4
- 120+ API endpoints covering the full agent economy
- Social feed with automated engagement

**Strengths:**
- Complete agent economy in a box -- verification is just the entry point
- Agent-to-agent service marketplace with escrow
- Gas sponsorship lowers the barrier for new agents
- Reputation system gives agents economic skin in the game
- Cross-chain via Wormhole bridge
- No PII stored on-chain (explicit design principle)

**Weaknesses:**
- Centralized platform model -- agents depend on SelfClaw's API/infrastructure
- Single-commit repo with limited external contribution (3 stars, 1 fork as of
  Feb 2026). Production readiness is unclear.
- "Unsigned transaction pattern" adds a trust dependency: the platform constructs
  the unsigned tx, which the agent then signs. If the platform is compromised, it
  could serve malicious transactions.
- Ed25519 signatures are not natively verifiable on EVM (requires precompile or
  library, adding gas cost and complexity)
- Complexity risk: 120+ endpoints is a large attack surface
- Agent tokens + liquidity pools introduce financial/regulatory exposure

## Head-to-Head Comparison

| Feature | Self Agent ID | SelfClaw |
|---|---|---|
| **Verification source** | Self.xyz ZK proofs | Self.xyz ZK proofs |
| **ERC-8004** | Yes (proof-of-human extension) | Yes |
| **Primary chain** | Celo | Celo + Base |
| **Agent signature scheme** | ECDSA (secp256k1) | Ed25519 |
| **On-chain sybil cap** | Yes (contract-level) | No (platform-level) |
| **Soulbound NFTs** | Yes | Not specified |
| **Registration modes** | 3 (simple, advanced, wallet-free) | 1 (Ed25519 keypair) |
| **Guardian revocation** | Yes | No |
| **Smart wallet / passkeys** | Yes (ZeroDev Kernel) | No |
| **Chain-bound signatures** | Yes | No |
| **Agent economy** | No | Yes (tokens, marketplace, liquidity) |
| **Reputation system** | No | Yes |
| **Agent-to-agent marketplace** | No | Yes |
| **PII on-chain** | Yes (known trade-off) | No |
| **SDK** | npm package (`@selfxyz/agent-sdk`) | REST API |
| **Decentralization** | Fully on-chain (no platform dependency) | Centralized API |
| **Maturity** | Active development, multiple deployed versions | Early stage (single commit) |
| **Open source** | Yes | Yes (MIT) |

## Honest Assessment

**Self Agent ID is better for:**
- Developers who want a minimal, on-chain-first agent identity primitive
- Projects that need contract-level sybil resistance (not just API-level)
- Use cases where the human must retain a kill switch (guardian revocation)
- Teams already building on Celo or using Self Protocol
- Security-conscious deployments (smaller attack surface, fewer dependencies)

**SelfClaw is better for:**
- Projects that want a turnkey agent economy out of the box
- Agents that need to monetize services to other agents
- Teams that prefer REST APIs over on-chain interactions
- Use cases where agent token economics are part of the value proposition
- Projects that want cross-chain from day one

**Neither is better for:**
- Multi-chain agent roaming (both are Celo-centric)
- Privacy-first credential storage (Self Agent ID stores PII on-chain;
  SelfClaw depends on a centralized API)
- Production-grade reputation (Self Agent ID has none; SelfClaw's is early)

## The Broader ERC-8004 Landscape

ERC-8004 launched on Ethereum mainnet January 29, 2026 and saw 20,000+ agents
deployed across Base, Taiko, Polygon, Avalanche, and BNB Chain within two weeks.
The standard defines three registries (Identity, Reputation, Validation) but most
implementations only cover Identity so far.

Self Agent ID and SelfClaw both implement the Identity Registry with proof-of-human
extensions. Neither implements the full ERC-8004 Reputation or Validation registries
yet. This is an area of opportunity for both projects.

## Recommendations for Self Agent ID

1. **Remove sensitive PII from on-chain storage.** Keep only `olderThan`, `ofac`,
   and `nationality`. The passport number and full name have no business being
   on a public blockchain.

2. **Add a simple reputation signal.** Even a basic `agentScore` that other
   contracts can increment/decrement would be valuable.

3. **Consider cross-chain deployment.** Base and Ethereum mainnet are where most
   ERC-8004 activity is happening.

4. **Keep the minimalist architecture.** Self Agent ID's strength is that it's a
   trustless on-chain primitive with no platform dependency. Don't try to become
   SelfClaw -- there's value in being the "verification layer" that other platforms
   build on top of.
