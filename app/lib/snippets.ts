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

// ============================================================
// Agent-side snippets — shown to agent operators after registration
// ============================================================

export function getAgentSnippets(): UseCaseSnippets[] {
  return [
    {
      title: "Sign Requests",
      description:
        "Your agent signs every outgoing request with its private key. Services that support Self Agent ID verify your agent automatically.",
      flow: "npm install @selfxyz/agent-sdk \u2192 Create SelfAgent \u2192 Use agent.fetch() \u2192 Service verifies automatically",
      snippets: [
        {
          label: "TypeScript",
          language: "typescript",
          code: `import { SelfAgent } from "@selfxyz/agent-sdk";

const agent = new SelfAgent({
  privateKey: process.env.AGENT_PRIVATE_KEY,
});

// Every request is signed automatically
const res = await agent.fetch("https://api.example.com/data", {
  method: "POST",
  body: JSON.stringify({ query: "test" }),
});

// Check your own registration status
const registered = await agent.isRegistered();`,
        },
        {
          label: "Rust",
          language: "rust",
          code: `use alloy::signers::local::PrivateKeySigner;
use alloy::primitives::keccak256;
use reqwest::header::HeaderMap;
use std::time::{SystemTime, UNIX_EPOCH};

fn sign_request(
    signer: &PrivateKeySigner,
    method: &str, url: &str, body: &str,
) -> HeaderMap {
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH).unwrap()
        .as_millis().to_string();
    let body_hash = keccak256(body.as_bytes());
    let message = keccak256(
        format!("{}{}{}{}", ts, method.to_uppercase(), url, body_hash)
    );
    let sig = signer.sign_message_sync(&message.0).unwrap();

    let mut headers = HeaderMap::new();
    headers.insert("x-self-agent-address",
        format!("{}", signer.address()).parse().unwrap());
    headers.insert("x-self-agent-signature",
        format!("0x{}", hex::encode(sig.as_bytes())).parse().unwrap());
    headers.insert("x-self-agent-timestamp",
        ts.parse().unwrap());
    headers
}`,
        },
        {
          label: "Python",
          language: "python",
          code: `import time, requests, os, json
from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3

agent = Account.from_key(os.environ["AGENT_PRIVATE_KEY"])

def signed_request(method: str, url: str, **kwargs):
    ts = str(int(time.time() * 1000))
    body = json.dumps(kwargs.get("json", "")) if "json" in kwargs else ""
    body_hash = Web3.keccak(text=body).hex()
    msg_hash = Web3.keccak(text=ts + method.upper() + url + body_hash)
    sig = agent.sign_message(
        encode_defunct(msg_hash)
    ).signature.hex()

    headers = kwargs.pop("headers", {})
    headers.update({
        "x-self-agent-address": agent.address,
        "x-self-agent-signature": "0x" + sig,
        "x-self-agent-timestamp": ts,
    })
    return requests.request(method, url, headers=headers, **kwargs)

# Usage
res = signed_request("POST", "https://api.example.com/data",
                      json={"query": "test"})`,
        },
      ],
    },
    {
      title: "Submit Transactions",
      description:
        "Your agent address is a real Ethereum wallet. Fund it with gas and it can call smart contracts directly. Contracts verify your agent on-chain via msg.sender.",
      flow: "Fund agent wallet with gas \u2192 Agent calls contract \u2192 Contract checks registry \u2192 Action proceeds",
      snippets: [
        {
          label: "TypeScript",
          language: "typescript",
          code: `import { ethers } from "ethers";

// Your agent wallet — fund this address with gas
const wallet = new ethers.Wallet(
  process.env.AGENT_PRIVATE_KEY,
  new ethers.JsonRpcProvider("https://forno.celo-sepolia.celo-testnet.org")
);

console.log("Agent address:", wallet.address);
console.log("Fund this address with CELO for gas");

// Call any contract that uses onlyVerifiedAgent modifier
const contract = new ethers.Contract(
  CONTRACT_ADDRESS, CONTRACT_ABI, wallet
);
const tx = await contract.agentAction("0x...");
await tx.wait();
// Contract checks msg.sender against the registry automatically`,
        },
      ],
    },
  ];
}

// ============================================================
// Service-side snippets — shown to developers who want to verify agents
// ============================================================

export function getServiceSnippets(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _contractAddress?: string,
): UseCaseSnippets[] {
  return [
    {
      title: "Agent \u2192 Service",
      description:
        "Verify that an AI agent calling your API is human-backed. Sybil resistant by default (1 agent per human). The SDK handles signature verification, on-chain checks, and caching.",
      flow: "npm install @selfxyz/agent-sdk \u2192 Create verifier \u2192 Add middleware \u2192 Done",
      snippets: [
        {
          label: "TypeScript (SDK)",
          language: "typescript",
          code: `import { SelfAgentVerifier } from "@selfxyz/agent-sdk";
import express from "express";

const app = express();
const verifier = new SelfAgentVerifier();
// Sybil resistant by default (1 agent per human)
// Uses Celo Sepolia registry — pass registryAddress for mainnet

// One-line middleware: verifies signature + on-chain status
app.use("/api", verifier.expressMiddleware());

// req.agent is available in all /api routes
app.post("/api/data", (req, res) => {
  console.log("Verified agent:", req.agent.address);
  res.json({ ok: true });
});

// For non-Express frameworks, use verifier.verify() directly`,
        },
        {
          label: "Python",
          language: "python",
          code: `import time
from web3 import Web3
from eth_account.messages import encode_defunct

w3 = Web3(Web3.HTTPProvider(
    "https://forno.celo-sepolia.celo-testnet.org"
))
REGISTRY = "0x24D46f30d41e91B3E0d1A8EB250FEa4B90270251"
REGISTRY_ABI = [
    {"name": "isVerifiedAgent", "type": "function", "stateMutability": "view",
     "inputs": [{"type": "bytes32"}], "outputs": [{"type": "bool"}]},
    {"name": "getAgentId", "type": "function", "stateMutability": "view",
     "inputs": [{"type": "bytes32"}], "outputs": [{"type": "uint256"}]},
    {"name": "getHumanNullifier", "type": "function", "stateMutability": "view",
     "inputs": [{"type": "uint256"}], "outputs": [{"type": "uint256"}]},
    {"name": "getAgentCountForHuman", "type": "function", "stateMutability": "view",
     "inputs": [{"type": "uint256"}], "outputs": [{"type": "uint256"}]},
]
registry = w3.eth.contract(address=REGISTRY, abi=REGISTRY_ABI)

def verify_agent(address: str, signature: str, ts: str,
                 method: str, url: str) -> bool:
    """Verify signature, on-chain status, and sybil resistance."""
    if time.time() * 1000 - int(ts) > 5 * 60 * 1000:
        return False
    message = encode_defunct(text=ts + method + url)
    recovered = w3.eth.account.recover_message(message, signature=signature)
    if recovered.lower() != address.lower():
        return False
    agent_key = w3.to_bytes(hexstr=address).rjust(32, b"\\x00")
    if not registry.functions.isVerifiedAgent(agent_key).call():
        return False
    agent_id = registry.functions.getAgentId(agent_key).call()
    nullifier = registry.functions.getHumanNullifier(agent_id).call()
    count = registry.functions.getAgentCountForHuman(nullifier).call()
    return count <= 1`,
        },
        {
          label: "Rust",
          language: "rust",
          code: `use alloy::primitives::{Address, FixedBytes, keccak256};
use alloy::providers::ProviderBuilder;
use alloy::sol;

sol! {
    #[sol(rpc)]
    interface ISelfAgentRegistry {
        function isVerifiedAgent(bytes32) external view returns (bool);
        function getAgentId(bytes32) external view returns (uint256);
        function getHumanNullifier(uint256) external view returns (uint256);
        function getAgentCountForHuman(uint256) external view returns (uint256);
    }
}

async fn verify_agent(
    agent_address: Address,
    signature: &[u8],
    timestamp: &str,
    method: &str,
    url: &str,
) -> bool {
    // 1. Check timestamp freshness
    let ts: u64 = timestamp.parse().unwrap_or(0);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64;
    if now - ts > 5 * 60 * 1000 { return false; }

    // 2. Recover signer and verify it matches claimed address
    let message = format!("{}{}{}", timestamp, method.to_uppercase(), url);
    // ... recover signer from EIP-191 signature ...

    // 3. Check on-chain
    let provider = ProviderBuilder::new()
        .on_http("https://forno.celo-sepolia.celo-testnet.org".parse().unwrap());
    let registry = ISelfAgentRegistry::new(
        "0x24D46f30d41e91B3E0d1A8EB250FEa4B90270251".parse().unwrap(),
        &provider,
    );
    let key = FixedBytes::left_padding_from(&agent_address.0 .0);
    if !registry.isVerifiedAgent(key).call().await.unwrap()._0 {
        return false;
    }
    let id = registry.getAgentId(key).call().await.unwrap()._0;
    let nullifier = registry.getHumanNullifier(id).call().await.unwrap()._0;
    let count = registry.getAgentCountForHuman(nullifier).call().await.unwrap()._0;
    count <= alloy::primitives::U256::from(1)
}`,
        },
      ],
    },
    {
      title: "Agent \u2192 Agent",
      description:
        "Verify a peer agent is human-backed and operated by a different human before collaborating. Prevents a single human from sybil-attacking your multi-agent system.",
      flow: "Receive signed message \u2192 Verify via SDK \u2192 Check sameHuman() \u2192 Ensure different humans",
      snippets: [
        {
          label: "TypeScript (SDK)",
          language: "typescript",
          code: `import { SelfAgent, SelfAgentVerifier } from "@selfxyz/agent-sdk";
import { ethers } from "ethers";

// My agent
const me = new SelfAgent({
  privateKey: process.env.AGENT_PRIVATE_KEY,
});

// Verifier for incoming peer requests
const verifier = new SelfAgentVerifier();

async function verifyPeer(req: Request): Promise<boolean> {
  const result = await verifier.verify({
    signature: req.headers.get("x-self-agent-signature")!,
    timestamp: req.headers.get("x-self-agent-timestamp")!,
    method: req.method,
    url: req.url,
  });
  if (!result.valid) return false;

  // Ensure peer is a different human
  const provider = new ethers.JsonRpcProvider(
    "https://forno.celo-sepolia.celo-testnet.org"
  );
  const registry = new ethers.Contract(
    "0x24D46f30d41e91B3E0d1A8EB250FEa4B90270251",
    ["function sameHuman(uint256,uint256) view returns (bool)"],
    provider,
  );
  const myInfo = await me.getInfo();
  return !(await registry.sameHuman(myInfo.agentId, result.agentId));
}`,
        },
        {
          label: "Solidity",
          language: "solidity",
          code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISelfAgentRegistry {
    function isVerifiedAgent(bytes32 key) external view returns (bool);
    function getAgentId(bytes32 key) external view returns (uint256);
    function sameHuman(uint256 a, uint256 b) external view returns (bool);
}

contract AgentCollaboration {
    ISelfAgentRegistry immutable registry =
        ISelfAgentRegistry(0x24D46f30d41e91B3E0d1A8EB250FEa4B90270251);

    modifier onlyMutuallyVerified(bytes32 agentA, bytes32 agentB) {
        require(registry.isVerifiedAgent(agentA), "Agent A not verified");
        require(registry.isVerifiedAgent(agentB), "Agent B not verified");
        require(
            !registry.sameHuman(
                registry.getAgentId(agentA),
                registry.getAgentId(agentB)
            ),
            "Same human"
        );
        _;
    }

    function collaborate(
        bytes32 agentA,
        bytes32 agentB,
        bytes calldata data
    ) external onlyMutuallyVerified(agentA, agentB) {
        // Both agents are human-backed by different humans
    }
}`,
        },
      ],
    },
    {
      title: "Agent \u2192 Chain",
      description:
        "Gate your smart contract so only human-backed agents can call it. The contract derives the agent key from msg.sender and checks the registry. Sybil resistant: 1 agent per human.",
      flow: "Agent calls your contract \u2192 Modifier derives key from msg.sender \u2192 Checks registry + sybil \u2192 Executes",
      snippets: [
        {
          label: "Solidity",
          language: "solidity",
          code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISelfAgentRegistry {
    function isVerifiedAgent(bytes32 key) external view returns (bool);
    function getAgentId(bytes32 key) external view returns (uint256);
    function getHumanNullifier(uint256 id) external view returns (uint256);
    function getAgentCountForHuman(uint256 n) external view returns (uint256);
}

contract MyProtocol {
    ISelfAgentRegistry immutable registry =
        ISelfAgentRegistry(0x24D46f30d41e91B3E0d1A8EB250FEa4B90270251);

    modifier onlyVerifiedAgent() {
        bytes32 agentKey = bytes32(uint256(uint160(msg.sender)));
        require(
            registry.isVerifiedAgent(agentKey),
            "Agent not human-verified"
        );
        uint256 agentId = registry.getAgentId(agentKey);
        uint256 nullifier = registry.getHumanNullifier(agentId);
        require(
            registry.getAgentCountForHuman(nullifier) <= 1,
            "Too many agents for this human"
        );
        _;
    }

    function agentAction(
        bytes calldata data
    ) external onlyVerifiedAgent {
        // Only human-backed agents reach here (1 per human)
    }
}`,
        },
      ],
    },
    {
      title: "Custom Limits",
      description:
        "By default, all snippets enforce 1 agent per human (sybil resistant). Override this if your use case requires a human to operate multiple agents.",
      flow: "Change maxAgentsPerHuman in SDK config \u2192 Or change the Solidity modifier constant",
      snippets: [
        {
          label: "TypeScript (SDK)",
          language: "typescript",
          code: `import { SelfAgentVerifier } from "@selfxyz/agent-sdk";

// Allow up to 5 agents per human:
const verifier = new SelfAgentVerifier({
  maxAgentsPerHuman: 5,
});

// Or disable sybil check entirely:
const verifierNoLimit = new SelfAgentVerifier({
  maxAgentsPerHuman: 0, // no limit
});`,
        },
        {
          label: "Solidity",
          language: "solidity",
          code: `// Change the hardcoded "1" to your limit:

modifier onlyVerifiedAgent() {
    bytes32 agentKey = bytes32(uint256(uint160(msg.sender)));
    require(registry.isVerifiedAgent(agentKey), "Not verified");
    uint256 agentId = registry.getAgentId(agentKey);
    uint256 nullifier = registry.getHumanNullifier(agentId);
    require(
        registry.getAgentCountForHuman(nullifier) <= 5, // allow 5 per human
        "Too many agents"
    );
    _;
}

// Or skip the count check to allow unlimited agents per human:

modifier onlyVerifiedAgentNoLimit() {
    bytes32 agentKey = bytes32(uint256(uint160(msg.sender)));
    require(registry.isVerifiedAgent(agentKey), "Not verified");
    _;
}`,
        },
      ],
    },
  ];
}
