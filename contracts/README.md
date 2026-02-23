# Self Agent ID — Smart Contracts

On-chain AI agent registry with ERC-8004 proof-of-human extension, deployed on Celo.

## Contracts

| Contract | Description |
|----------|-------------|
| `SelfAgentRegistry` | Core registry — ERC-721 soulbound NFTs, 4 registration modes (simple/advanced/wallet-free/smart-wallet), ZK-attested credentials, multi-config verification |
| `SelfHumanProofProvider` | Proof provider — connects to Self Protocol Hub V2, verifies ZK proofs, manages 6 verification configs (age 0/18/21 x OFAC off/on) |
| `AgentDemoVerifier` | Demo contract — EIP-712 meta-transaction verifier for gasless on-chain agent verification |
| `AgentGate` | Access gate — `onlyVerifiedAgent` modifier for gating contract functions to verified agents |
| `SelfReputationProvider` | Reputation — verification strength scoring from proof providers |
| `SelfValidationProvider` | Validation — real-time proof status and freshness checks |
| `LocalRegistryHarness` | Test harness — local mock for testing without Hub V2 dependency |

## Deployed Addresses

### Celo Mainnet (42220)

| Contract | Address |
|----------|---------|
| Registry | `0x62E37d0f6c5f67784b8828B3dF68BCDbB2e55095` |
| Provider | `0xb0F718Bad279e51A9447D36EAa457418dBd4D95b` |
| DemoVerifier | `0x063c3bc21F0C4A6c51A84B1dA6de6510508E4F1e` |
| AgentGate | `0xD4B30Da5319893FEAB07620DbFf0945e3aDef619` |

### Celo Sepolia (11142220)

| Contract | Address |
|----------|---------|
| Registry | `0x29d941856134b1D053AfFF57fa560324510C79fa` |
| Provider | `0x8e248DEB0F18B0A4b1c608F2d80dBCeB1B868F81` |
| DemoVerifier | `0x31A5A1d34728c5e6425594A596997A7Bf4aD607d` |
| AgentGate | `0x9880Dc26c5D5aAA334e12C255a03A3Be3E50003E` |

## Build & Test

Requires [Foundry](https://book.getfoundry.sh/).

```shell
forge build --evm-version cancun
./scripts/test.sh
```

The `--evm-version cancun` flag is required because Self Protocol Hub V2 uses `PUSH0`.

`./scripts/test.sh` runs `forge test --offline` by default to avoid a known Foundry
panic in some environments when resolving external signature metadata.
Set `SELF_AGENT_CONTRACTS_ONLINE=1` to force the online `forge test` path.

## Key Design Decisions

- **Soulbound NFTs**: Agent tokens are non-transferable (mint/burn only)
- **Async verification**: ZK proof verification happens via Hub V2 callback, not in the registration tx
- **Multi-config**: 6 verification configs (age thresholds x OFAC screening), selected via `userDefinedData[1]`
- **Guardian system**: Wallet-free and smart-wallet modes support optional guardians for agent revocation
- **Nullifier-based sybil resistance**: Each human maps to a unique nullifier; `sameHuman()` and `getAgentCountForHuman()` enable per-service sybil policies
