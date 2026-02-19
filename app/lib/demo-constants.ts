import { ethers } from "ethers";

// Pre-registered demo agent on Celo Sepolia
export const DEMO_AGENT_ADDRESS = "0x83fa4380903fecb801F4e123835664973001ff00";
export const DEMO_AGENT_KEY = ethers.zeroPadValue(DEMO_AGENT_ADDRESS, 32);

export const TESTS = [
  {
    id: "service" as const,
    title: "Agent-to-Service",
    description: "Agent authenticates to a gated census service. POST contributes your ZK-attested credentials. GET returns aggregate stats: top nationalities, age verification rates, and OFAC compliance \u2014 only accessible to verified agents.",
  },
  {
    id: "peer" as const,
    title: "Agent-to-Agent",
    description: "Your agent sends a signed request to the demo agent\u2019s API. The demo agent verifies your signature on-chain, checks sameHuman(), and signs its response back.",
  },
  {
    id: "gate" as const,
    title: "Agent-to-Chain",
    description: "Agent signs an EIP-712 meta-transaction. A relayer submits it to the AgentDemoVerifier contract on Celo Sepolia, which verifies the agent\u2019s signature on-chain, checks credentials, and writes state \u2014 with a Blockscout link to prove it. Rate-limited to 3 per hour per human.",
  },
] as const;

export type TestId = (typeof TESTS)[number]["id"];
