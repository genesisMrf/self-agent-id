export interface Snippet {
  label: string;
  language: string;
  code: string;
}

export interface UseCaseSnippets {
  title: string;
  description: string;
  flow: string;
  snippets: Snippet[];
}

export function getSnippets(
  contractAddress: string = "0x404A2Bce7Dc4A9c19Cc41c4247E2bA107bce394C",
): UseCaseSnippets[] {
  return [
    {
      title: "Agent \u2192 Service",
      description:
        "A service verifies that an AI agent is human-backed before granting access. The SDK signs every request with the agent's private key; the service recovers the signer and checks on-chain status.",
      flow: "Agent signs request \u2192 Service recovers signer from signature \u2192 Service checks on-chain \u2192 Access granted",
      snippets: [
        {
          label: "TypeScript (Agent)",
          language: "typescript",
          code: `import { SelfAgent } from "@selfxyz/agent-sdk";

const agent = new SelfAgent({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  registryAddress: "${contractAddress}",
  rpcUrl: "https://forno.celo-sepolia.celo-testnet.org",
});

// Every request is automatically signed
const res = await agent.fetch("https://api.example.com/data", {
  method: "POST",
  body: JSON.stringify({ query: "test" }),
});`,
        },
        {
          label: "TypeScript (Service)",
          language: "typescript",
          code: `import { SelfAgentVerifier } from "@selfxyz/agent-sdk";
import express from "express";

const verifier = new SelfAgentVerifier({
  registryAddress: "${contractAddress}",
  rpcUrl: "https://forno.celo-sepolia.celo-testnet.org",
});

const app = express();

// Middleware: recovers signer from signature, checks on-chain
app.use("/api", verifier.expressMiddleware());

app.post("/api/data", (req, res) => {
  // req.agent.address — recovered from signature
  // req.agent.agentId — from on-chain registry
  res.json({ agent: req.agent.address });
});`,
        },
        {
          label: "Python (Service)",
          language: "python",
          code: `from web3 import Web3
from eth_account.messages import encode_defunct

w3 = Web3(Web3.HTTPProvider(
    "https://forno.celo-sepolia.celo-testnet.org"
))
registry = w3.eth.contract(
    address="${contractAddress}",
    abi=REGISTRY_ABI
)

def verify_agent_request(signature, timestamp, method, url, body=""):
    """Recover signer from signature, then check on-chain."""
    # 1. Reconstruct the signed message
    body_hash = w3.keccak(text=body).hex()
    message = w3.keccak(text=timestamp + method + url + body_hash)

    # 2. Recover signer address (cryptographic — can't be faked)
    signer = w3.eth.account.recover_message(
        encode_defunct(message), signature=signature
    )

    # 3. Check on-chain: is this address a verified agent?
    agent_key = w3.to_bytes(hexstr=signer).rjust(32, b"\\x00")
    return registry.functions.isVerifiedAgent(agent_key).call()`,
        },
      ],
    },
    {
      title: "Sybil Detection",
      description:
        "Detect when multiple agents are controlled by the same human. Each human has a unique nullifier — services can enforce their own limits.",
      flow: "Service checks nullifier \u2192 Compares agent count \u2192 Enforces policy (e.g., max 1 per human)",
      snippets: [
        {
          label: "Solidity",
          language: "solidity",
          code: `interface ISelfAgentRegistry {
    function isVerifiedAgent(bytes32 key) external view returns (bool);
    function getAgentId(bytes32 key) external view returns (uint256);
    function getHumanNullifier(uint256 id) external view returns (uint256);
    function getAgentCountForHuman(uint256 n) external view returns (uint256);
    function sameHuman(uint256 a, uint256 b) external view returns (bool);
}

contract MyProtocol {
    ISelfAgentRegistry immutable registry =
        ISelfAgentRegistry(${contractAddress});

    // Configurable: how many agents per human this service allows
    uint256 public maxAgentsPerHuman = 1;

    modifier onlyUniqueHuman(bytes32 agentKey) {
        require(registry.isVerifiedAgent(agentKey), "Not verified");
        uint256 agentId = registry.getAgentId(agentKey);
        uint256 nullifier = registry.getHumanNullifier(agentId);
        require(
            registry.getAgentCountForHuman(nullifier) <= maxAgentsPerHuman,
            "Too many agents for this human"
        );
        _;
    }
}`,
        },
        {
          label: "TypeScript (Service)",
          language: "typescript",
          code: `import { ethers } from "ethers";

const MAX_AGENTS_PER_HUMAN = 1; // your policy

async function checkSybil(agentKey: string): Promise<boolean> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const registry = new ethers.Contract(
    "${contractAddress}", REGISTRY_ABI, provider
  );

  const agentId = await registry.getAgentId(agentKey);
  if (agentId === 0n) return false; // not registered

  const nullifier = await registry.getHumanNullifier(agentId);
  const count = await registry.getAgentCountForHuman(nullifier);

  return count <= BigInt(MAX_AGENTS_PER_HUMAN);
}`,
        },
        {
          label: "Solidity (Peer check)",
          language: "solidity",
          code: `// Check if two agents are the same human (sybil check)
bool isSybil = ISelfAgentRegistry(${contractAddress})
    .sameHuman(agentIdA, agentIdB);

// Example: reject votes from same human
require(!isSybil, "Same human voting twice");`,
        },
      ],
    },
    {
      title: "Agent \u2192 Chain",
      description:
        "A smart contract checks that the caller is a verified human-backed agent before executing an action.",
      flow: "Agent calls contract \u2192 Contract derives agent key from msg.sender \u2192 Checks registry \u2192 Action proceeds",
      snippets: [
        {
          label: "Solidity",
          language: "solidity",
          code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISelfAgentRegistry {
    function isVerifiedAgent(
        bytes32 agentPubKey
    ) external view returns (bool);
}

contract MyProtocol {
    ISelfAgentRegistry immutable registry =
        ISelfAgentRegistry(${contractAddress});

    // Derive agent key from msg.sender (matches MVP model)
    modifier onlyVerifiedAgent() {
        bytes32 agentKey = bytes32(uint256(uint160(msg.sender)));
        require(
            registry.isVerifiedAgent(agentKey),
            "Agent not human-verified"
        );
        _;
    }

    function agentAction(
        bytes calldata data
    ) external onlyVerifiedAgent {
        // Only human-backed agents reach here
        // msg.sender IS the verified agent
    }
}`,
        },
        {
          label: "TypeScript (Submit tx)",
          language: "typescript",
          code: `import { ethers } from "ethers";

// Agent's wallet — the address IS the agent identity
const wallet = new ethers.Wallet(
  process.env.AGENT_PRIVATE_KEY,
  new ethers.JsonRpcProvider(RPC_URL)
);

const myProtocol = new ethers.Contract(
  MY_PROTOCOL_ADDRESS,
  MY_PROTOCOL_ABI,
  wallet
);

// No need to pass agent key — contract derives it from msg.sender
const tx = await myProtocol.agentAction("0x...");
await tx.wait();`,
        },
      ],
    },
  ];
}
