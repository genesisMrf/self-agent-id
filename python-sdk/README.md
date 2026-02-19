# selfxyz-agent-sdk

Python SDK for [Self Agent ID](https://agent-id.self.xyz) — proof-of-human verification for AI agents.

Sign requests in Python, verify in TypeScript, or vice versa. The signing protocol is language-agnostic — all SDKs produce identical signatures.

## Install

```bash
pip install selfxyz-agent-sdk
```

## Agent Side — Sign Requests

```python
from self_agent_sdk import SelfAgent

agent = SelfAgent(private_key="0x...", network="mainnet")

# Sign a request (returns dict of auth headers)
headers = agent.sign_request("POST", "https://api.example.com/data",
                             body='{"query": "test"}')

# Or use the built-in HTTP client
response = agent.fetch("https://api.example.com/data",
                       method="POST", body='{"query": "test"}')

# Check registration status
print(agent.is_registered())  # True/False
print(agent.get_info())       # AgentInfo(agent_id=5, is_verified=True, ...)
```

## Service Side — Verify Requests

```python
from self_agent_sdk import SelfAgentVerifier

verifier = SelfAgentVerifier()  # mainnet by default

result = verifier.verify(
    signature=request.headers["x-self-agent-signature"],
    timestamp=request.headers["x-self-agent-timestamp"],
    method=request.method,
    url=request.path,
    body=request.get_data(as_text=True),
)

if result.valid:
    print(f"Verified agent: {result.agent_address}")
```

### Flask Middleware

```python
from flask import Flask, g, jsonify
from self_agent_sdk import SelfAgentVerifier
from self_agent_sdk.middleware.flask import require_agent

app = Flask(__name__)
verifier = SelfAgentVerifier()

@app.route("/api/data", methods=["POST"])
@require_agent(verifier)
def handle():
    print(g.agent.agent_address)
    return jsonify(ok=True)
```

### FastAPI Dependency

```python
from fastapi import FastAPI, Depends
from self_agent_sdk import SelfAgentVerifier
from self_agent_sdk.middleware.fastapi import AgentAuth
from self_agent_sdk.types import VerificationResult

app = FastAPI()
verifier = SelfAgentVerifier()
auth = AgentAuth(verifier)

@app.post("/api/data")
async def handle(agent: VerificationResult = Depends(auth)):
    print(agent.agent_address)
    return {"ok": True}
```

## Configuration

```python
# Testnet
agent = SelfAgent(private_key="0x...", network="testnet")
verifier = SelfAgentVerifier(network="testnet")

# Custom overrides
verifier = SelfAgentVerifier(
    registry_address="0x...",      # Custom registry
    rpc_url="https://...",         # Custom RPC
    max_agents_per_human=5,        # Sybil cap (0 = disabled)
    require_self_provider=True,    # Verify proof provider (default)
    include_credentials=True,      # Fetch ZK-attested credentials
)
```

## Security

The verifier implements a 6-step security chain:

1. **Timestamp freshness** — reject replayed requests (default: 5 min window)
2. **Signature recovery** — derive agent address from ECDSA signature (can't be faked)
3. **Agent key derivation** — `zeroPad(address, 32)` for on-chain lookup
4. **On-chain verification** — `isVerifiedAgent(agentKey)` confirms human backing
5. **Provider check** — ensures proof came from Self Protocol, not a third party
6. **Sybil resistance** — limits agents per human (default: 1)

## Cross-Language Compatibility

This SDK is 100% compatible with the TypeScript SDK (`@selfxyz/agent-sdk`). Test vectors generated from TypeScript are verified byte-for-byte in the Python test suite.

## Networks

| Network | Registry | Chain ID |
|---------|----------|----------|
| Mainnet (Celo) | `0x62E37d0f6c5f67784b8828B3dF68BCDbB2e55095` | 42220 |
| Testnet (Celo Sepolia) | `0x42CEA1b318557aDE212bED74FC3C7f06Ec52bd5b` | 44787 |

## License

MIT
