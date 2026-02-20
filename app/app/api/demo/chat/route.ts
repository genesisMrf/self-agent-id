import { NextRequest, NextResponse } from "next/server";
import { HEADERS } from "@selfxyz/agent-sdk";

const LANGCHAIN_URL = process.env.LANGCHAIN_URL || "http://127.0.0.1:8090";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const parsed = JSON.parse(body || "{}");

  // The SDK sends x-self-agent-address alongside the signature.
  // We pass it through — the LangChain service verifies on-chain itself
  // and the AI agent refuses unverified callers.
  const agentAddress = req.headers.get(HEADERS.ADDRESS) || "anonymous";

  // Network comes from query param (?network=celo-sepolia)
  const network = req.nextUrl.searchParams.get("network") || "celo-sepolia";

  try {
    const langchainRes = await fetch(`${LANGCHAIN_URL}/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: parsed.query || "",
        agent_address: agentAddress,
        network,
        session_id: parsed.session_id || "unknown",
      }),
    });

    if (!langchainRes.ok) {
      const errText = await langchainRes.text();
      let detail = errText;
      try {
        const errJson = JSON.parse(errText);
        detail = errJson.detail || errText;
      } catch { /* plain text */ }
      return NextResponse.json({ error: detail }, { status: langchainRes.status });
    }

    const data = await langchainRes.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "LangChain service unavailable" },
      { status: 503 },
    );
  }
}
