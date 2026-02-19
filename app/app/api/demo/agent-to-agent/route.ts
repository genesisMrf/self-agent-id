import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { SelfAgentVerifier, SelfAgent, HEADERS } from "@selfxyz/agent-sdk";

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_SELF_ENDPOINT!;
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://forno.celo-sepolia.celo-testnet.org";
const DEMO_AGENT_PK = process.env.DEMO_AGENT_PRIVATE_KEY;

// In-memory counters (resets on server restart — fine for demo)
let verificationCount = 0;
const uniqueHumans = new Set<string>();

const verifier = new SelfAgentVerifier({
  registryAddress: REGISTRY_ADDRESS,
  rpcUrl: RPC_URL,
  maxAgentsPerHuman: 0,
  includeCredentials: false,
});

export async function POST(req: NextRequest) {
  if (!DEMO_AGENT_PK) {
    return NextResponse.json(
      { error: "Demo agent not configured (missing DEMO_AGENT_PRIVATE_KEY)" },
      { status: 500 }
    );
  }

  // 1. Extract caller's signature headers
  const signature = req.headers.get(HEADERS.SIGNATURE);
  const timestamp = req.headers.get(HEADERS.TIMESTAMP);

  if (!signature || !timestamp) {
    return NextResponse.json(
      { error: "Missing agent authentication headers" },
      { status: 401 }
    );
  }

  const body = await req.text();

  // 2. Demo agent verifies the caller's identity on-chain
  const verifyResult = await verifier.verify({
    signature,
    timestamp,
    method: "POST",
    url: req.url,
    body: body || undefined,
  });

  if (!verifyResult.valid) {
    return NextResponse.json(
      {
        verified: false,
        error: verifyResult.error || "Agent verification failed",
      },
      { status: 403 }
    );
  }

  // 3. Demo agent does on-chain sameHuman check
  const demoAgent = new SelfAgent({
    privateKey: DEMO_AGENT_PK,
    registryAddress: REGISTRY_ADDRESS,
    rpcUrl: RPC_URL,
  });

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const registry = new ethers.Contract(
    REGISTRY_ADDRESS,
    [
      "function getAgentId(bytes32) view returns (uint256)",
      "function sameHuman(uint256, uint256) view returns (bool)",
      "function isVerifiedAgent(bytes32) view returns (bool)",
    ],
    provider
  );

  const demoKey = ethers.zeroPadValue(demoAgent.address, 32);
  const callerKey = verifyResult.agentKey!;

  const [demoVerified, demoId, callerId, callerVerified] = await Promise.all([
    registry.isVerifiedAgent(demoKey),
    registry.getAgentId(demoKey),
    registry.getAgentId(callerKey),
    registry.isVerifiedAgent(callerKey),
  ]);

  let sameHumanResult = false;
  if (demoId > 0n && callerId > 0n) {
    sameHumanResult = await registry.sameHuman(demoId, callerId);
  }

  // Track verification stats
  verificationCount++;
  // Use callerAgent address as a proxy for unique human (nullifier not available here)
  if (verifyResult.agentAddress) {
    uniqueHumans.add(verifyResult.agentAddress.toLowerCase());
  }

  const message = `Beep boop! You are agent #${verificationCount} that I have verified as being verified by a human. I have seen ${uniqueHumans.size} unique agent${uniqueHumans.size === 1 ? "" : "s"} so far.`;

  // 4. Build response payload
  const responsePayload = {
    verified: true,
    demoAgent: {
      address: demoAgent.address,
      agentId: demoId.toString(),
      verified: demoVerified,
    },
    callerAgent: {
      address: verifyResult.agentAddress,
      agentId: callerId.toString(),
      verified: callerVerified,
    },
    sameHuman: sameHumanResult,
    verificationCount,
    uniqueAgents: uniqueHumans.size,
    message,
  };

  const responseBody = JSON.stringify(responsePayload);

  // 5. Demo agent signs the response so caller can verify it came from us
  const responseHeaders = await demoAgent.signRequest(
    "POST",
    req.url,
    responseBody
  );

  return new NextResponse(responseBody, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      [HEADERS.ADDRESS]: responseHeaders[HEADERS.ADDRESS],
      [HEADERS.SIGNATURE]: responseHeaders[HEADERS.SIGNATURE],
      [HEADERS.TIMESTAMP]: responseHeaders[HEADERS.TIMESTAMP],
    },
  });
}
