import {
  createPublicClient,
  http,
  type Address,
  type Chain,
  type Hex,
  encodeFunctionData,
} from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk";
import { toPasskeyValidator, PasskeyValidatorContractVersion, toWebAuthnKey, WebAuthnMode } from "@zerodev/passkey-validator";
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";

// ── Chain definition ──────────────────────────────────────────────────
export const celoSepolia: Chain = {
  id: 11142220,
  name: "Celo Sepolia Testnet",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://celo-sepolia.blockscout.com" },
  },
  testnet: true,
};

// Chain used by the dApp — Celo Sepolia for testnet, Celo mainnet for production
const CHAIN = celoSepolia;

// ── Config ────────────────────────────────────────────────────────────
function getPimlicoApiKey(): string | null {
  return process.env.NEXT_PUBLIC_PIMLICO_API_KEY || null;
}

function getZeroDevProjectId(): string | null {
  return process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID || null;
}

function getBundlerUrl(): string {
  const key = getPimlicoApiKey();
  if (!key) throw new Error("NEXT_PUBLIC_PIMLICO_API_KEY not set — gasless operations unavailable on this network");
  return `https://api.pimlico.io/v2/${CHAIN.id}/rpc?apikey=${key}`;
}

function getPaymasterUrl(): string {
  const key = getPimlicoApiKey();
  if (!key) throw new Error("NEXT_PUBLIC_PIMLICO_API_KEY not set — gasless operations unavailable on this network");
  return `https://api.pimlico.io/v2/${CHAIN.id}/rpc?apikey=${key}`;
}

function getPasskeyServerUrl(): string {
  const id = getZeroDevProjectId();
  if (!id) throw new Error("NEXT_PUBLIC_ZERODEV_PROJECT_ID not set — passkey server unavailable");
  return `https://passkeys.zerodev.app/api/v3/${id}`;
}

// ── Feature detection ─────────────────────────────────────────────────
export function isPasskeySupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === "function"
  );
}

/**
 * Returns true if gasless UserOps are available (Pimlico bundler + paymaster configured).
 * On testnet (Celo Sepolia), Pimlico doesn't support the chain — passkey creation still
 * works (counterfactual address), but gasless revocation is unavailable.
 * On mainnet (Celo), Pimlico supports gasless operations.
 */
export function isGaslessSupported(): boolean {
  return !!getPimlicoApiKey() && !CHAIN.testnet;
}

// ── Shared helpers ────────────────────────────────────────────────────
function getPublicClient() {
  return createPublicClient({
    chain: CHAIN,
    transport: http(),
  });
}

const ENTRYPOINT = {
  address: entryPoint07Address,
  version: "0.7" as const,
};

// ── Create passkey wallet (Register) ──────────────────────────────────
export async function createPasskeyWallet(passkeyName: string): Promise<{
  credentialId: string;
  walletAddress: Address;
}> {
  const publicClient = getPublicClient();

  // 1. Create WebAuthn credential (browser biometric prompt)
  const webAuthnKey = await toWebAuthnKey({
    passkeyName,
    passkeyServerUrl: getPasskeyServerUrl(),
    mode: WebAuthnMode.Register,
  });

  // 2. Build passkey validator
  const passkeyValidator = await toPasskeyValidator(publicClient, {
    webAuthnKey,
    entryPoint: ENTRYPOINT,
    kernelVersion: KERNEL_V3_1,
    validatorContractVersion: PasskeyValidatorContractVersion.V0_0_3_PATCHED,
  });

  // 3. Create Kernel account (counterfactual — not deployed yet)
  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: passkeyValidator },
    entryPoint: ENTRYPOINT,
    kernelVersion: KERNEL_V3_1,
  });

  return {
    credentialId: webAuthnKey.authenticatorId,
    walletAddress: account.address,
  };
}

// ── Sign in with existing passkey (Login) ─────────────────────────────
export async function signInWithPasskey(): Promise<{
  credentialId: string;
  walletAddress: Address;
}> {
  const publicClient = getPublicClient();

  // Login mode — browser prompts for existing credential
  const webAuthnKey = await toWebAuthnKey({
    passkeyName: "Self Agent ID",
    passkeyServerUrl: getPasskeyServerUrl(),
    mode: WebAuthnMode.Login,
  });

  const passkeyValidator = await toPasskeyValidator(publicClient, {
    webAuthnKey,
    entryPoint: ENTRYPOINT,
    kernelVersion: KERNEL_V3_1,
    validatorContractVersion: PasskeyValidatorContractVersion.V0_0_3_PATCHED,
  });

  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: passkeyValidator },
    entryPoint: ENTRYPOINT,
    kernelVersion: KERNEL_V3_1,
  });

  return {
    credentialId: webAuthnKey.authenticatorId,
    walletAddress: account.address,
  };
}

// ── Send a UserOperation (gasless) ────────────────────────────────────
// Only available when Pimlico supports the current chain (mainnet).
// On testnet, callers should use passport-scan fallback for revocation.
export async function sendUserOperation(
  target: Address,
  callData: Hex
): Promise<Hex> {
  if (!isGaslessSupported()) {
    throw new Error(
      "Gasless operations are not available on this network. " +
      "On testnet, use passport scan to deregister your agent instead."
    );
  }

  const publicClient = getPublicClient();

  // Re-authenticate with passkey (Login mode)
  const webAuthnKey = await toWebAuthnKey({
    passkeyName: "Self Agent ID",
    passkeyServerUrl: getPasskeyServerUrl(),
    mode: WebAuthnMode.Login,
  });

  const passkeyValidator = await toPasskeyValidator(publicClient, {
    webAuthnKey,
    entryPoint: ENTRYPOINT,
    kernelVersion: KERNEL_V3_1,
    validatorContractVersion: PasskeyValidatorContractVersion.V0_0_3_PATCHED,
  });

  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: passkeyValidator },
    entryPoint: ENTRYPOINT,
    kernelVersion: KERNEL_V3_1,
  });

  // Paymaster client
  const paymasterClient = createZeroDevPaymasterClient({
    chain: CHAIN,
    transport: http(getPaymasterUrl()),
  });

  // Kernel account client — bundles + sponsors UserOps
  const kernelClient = createKernelAccountClient({
    account,
    chain: CHAIN,
    bundlerTransport: http(getBundlerUrl()),
    paymaster: paymasterClient,
  });

  // Send the UserOp
  const txHash = await kernelClient.sendTransaction({
    to: target,
    data: callData,
    value: 0n,
  });

  return txHash;
}

// ── Helper: encode guardianRevoke calldata ────────────────────────────
export function encodeGuardianRevoke(agentId: bigint): Hex {
  return encodeFunctionData({
    abi: [
      {
        name: "guardianRevoke",
        type: "function",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [],
      },
    ],
    functionName: "guardianRevoke",
    args: [agentId],
  });
}
