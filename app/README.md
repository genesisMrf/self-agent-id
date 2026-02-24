# Self Agent ID Web App

Next.js app for registration, verification, demo testing, and public API resolvers.

## Run Locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Key Pages

- `/register`: Register an agent (4 modes)
- `/demo`: End-to-end integration tests
- `/verify`: Inspect a specific agent key/id
- `/my-agents`: Wallet/passkey/key-based lookup
- `/explainer`: Integration guide + snippets
- `/erc8004`: ERC-8004 extension proposal

## Public API Routes

- `GET /api/cards/:chainId/:agentId`
- `GET /api/reputation/:chainId/:agentId`
- `GET /api/verify-status/:chainId/:agentId`
- `GET /.well-known/a2a/:agentId?chain={chainId}`

## Demo API Routes

- `POST /api/demo/verify`
- `GET|POST /api/demo/census`
- `POST /api/demo/agent-to-agent`
- `POST /api/demo/chain-verify`
- `POST /api/demo/chat`

## Environment

Use `.env.example` as the source of truth for required variables.
