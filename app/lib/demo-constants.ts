import { ethers } from "ethers";

// Pre-registered demo agent (registered on both Celo mainnet and Sepolia)
export const DEMO_AGENT_ADDRESS = "0xcfCACe4011fF8567cf2ED355116b2A7Dc2dEAbbA";
export const DEMO_AGENT_KEY = ethers.zeroPadValue(DEMO_AGENT_ADDRESS, 32);

// Cloud Run / Cloud Function URLs — legacy env vars (testnet)
export const DEMO_SERVICE_URL = process.env.NEXT_PUBLIC_DEMO_SERVICE_URL || "";
export const DEMO_AGENT_URL = process.env.NEXT_PUBLIC_DEMO_AGENT_URL || "";

export const TESTS = [
  {
    id: "service" as const,
    title: "Agent-to-Service",
    description: "Your agent signs an ECDSA request and calls a gated census service on Cloud Run. The service recovers the signer from the signature, checks isVerifiedAgent() on-chain, then reads ZK-attested credentials. POST contributes credentials to the census. GET returns aggregate stats: top nationalities, age verification rates, and OFAC compliance.",
  },
  {
    id: "peer" as const,
    title: "Agent-to-Agent",
    description: "Your agent sends an ECDSA-signed request to another agent running on Cloud Run. That agent recovers the signer from the signature, verifies it on-chain via isVerifiedAgent(), then checks sameHuman() to detect whether both agents share the same human backer. The response is signed back \u2014 proving mutual authentication.",
  },
  {
    id: "gate" as const,
    title: "Agent-to-Chain",
    description: "Your agent signs an EIP-712 typed-data meta-transaction off-chain. A relayer submits it to the AgentDemoVerifier contract, which recovers the signer via ecrecover, checks isVerifiedAgent() on the registry, reads credentials, and writes verification state on-chain. Explorer link proves the transaction. Rate-limited to 3 per hour per human.",
  },
  {
    id: "chat" as const,
    title: "AI Agent Chat",
    description: "Chat with a LangChain-powered AI agent running on Cloud Run. The agent independently verifies callers on-chain via isVerifiedAgent() before responding \u2014 unverified agents are hard-refused at the service level, never trusted to the LLM. Authenticated via ECDSA request signing, rate-limited to 10 messages per hour.",
  },
] as const;

export type TestId = (typeof TESTS)[number]["id"];
