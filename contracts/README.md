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
| Registry | `0xaC3DF9ABf80d0F5c020C06B04Cced27763355944` |
| Provider | `0x4b036aFD959B457A208F676cf44Ea3ef73Ea3E3d` |
| DemoVerifier | `0xD8ec054FD869A762bC977AC328385142303c7def` |
| AgentGate | `0x26e05bF632fb5bACB665ab014240EAC1413dAE35` |
| ReputationRegistry | `0x69Da18CF4Ac27121FD99cEB06e38c3DC78F363f4` |
| ValidationRegistry | `0x71a025e0e338EAbcB45154F8b8CA50b41e7A0577` |

### Celo Sepolia (11142220)

| Contract | Address |
|----------|---------|
| Registry | `0x043DaCac8b0771DD5b444bCC88f2f8BBDBEdd379` |
| Provider | `0x5E61c3051Bf4115F90AacEAE6212bc419f8aBB6c` |
| DemoVerifier | `0xc31BAe8f2d7FCd19f737876892f05d9bDB294241` |
| AgentGate | `0x86Af07e30Aa42367cbcA7f2B1764Be346598bbc2` |
| ReputationRegistry | `0x3Bb0A898C1C0918763afC22ff624131b8F420CC2` |
| ValidationRegistry | `0x84cA20B8A1559F136dA03913dbe6A7F68B6B240B` |

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
