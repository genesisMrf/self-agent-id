import { ethers } from "ethers";
import {
  REGISTRY_ABI,
  HEADERS,
  DEFAULT_MAX_AGE_MS,
  DEFAULT_CACHE_TTL_MS,
} from "./constants";

export interface VerifierConfig {
  /** Deployed SelfAgentRegistry contract address */
  registryAddress: string;
  /** JSON-RPC URL for reading contract state */
  rpcUrl: string;
  /** Max age for signed timestamps (default: 5 min) */
  maxAgeMs?: number;
  /** TTL for on-chain status cache (default: 5 min) */
  cacheTtlMs?: number;
}

export interface VerificationResult {
  valid: boolean;
  /** The agent's Ethereum address (recovered from signature) */
  agentAddress: string;
  /** The agent's on-chain key (bytes32) */
  agentKey: string;
  agentId: bigint;
  error?: string;
}

interface CacheEntry {
  isVerified: boolean;
  agentId: bigint;
  expiresAt: number;
}

/**
 * Service-side verifier for Self Agent ID requests.
 *
 * Security chain:
 * 1. Recover signer address from ECDSA signature (cryptographic proof of key ownership)
 * 2. Derive agent key: zeroPadValue(recoveredAddress, 32)
 * 3. Check on-chain: isVerifiedAgent(agentKey) (proof that a human registered this address)
 * 4. Check timestamp freshness (replay protection)
 *
 * The signer address is RECOVERED from the signature, never trusted from headers.
 * This closes the off-chain verification gap — you can't claim to be an agent
 * without holding its private key.
 *
 * Usage:
 * ```ts
 * const verifier = new SelfAgentVerifier({
 *   registryAddress: "0x...",
 *   rpcUrl: "https://forno.celo-sepolia.celo-testnet.org",
 * });
 *
 * const result = await verifier.verify({
 *   signature: req.headers["x-self-agent-signature"],
 *   timestamp: req.headers["x-self-agent-timestamp"],
 *   method: req.method,
 *   url: req.originalUrl,
 *   body: req.body ? JSON.stringify(req.body) : undefined,
 * });
 *
 * if (result.valid) {
 *   console.log("Verified agent:", result.agentAddress);
 * }
 * ```
 */
export class SelfAgentVerifier {
  private registry: ethers.Contract;
  private maxAgeMs: number;
  private cacheTtlMs: number;
  private cache = new Map<string, CacheEntry>();

  constructor(config: VerifierConfig) {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.registry = new ethers.Contract(
      config.registryAddress,
      REGISTRY_ABI,
      provider
    );
    this.maxAgeMs = config.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
    this.cacheTtlMs = config.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  }

  /**
   * Verify a signed agent request.
   *
   * The agent's identity is derived from the signature itself — not from
   * any header that could be spoofed. This is the key security property.
   */
  async verify(params: {
    signature: string;
    timestamp: string;
    method: string;
    url: string;
    body?: string;
  }): Promise<VerificationResult> {
    const { signature, timestamp, method, url, body } = params;
    const empty: VerificationResult = {
      valid: false,
      agentAddress: ethers.ZeroAddress,
      agentKey: ethers.ZeroHash,
      agentId: 0n,
    };

    // 1. Check timestamp freshness (replay protection)
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || Math.abs(Date.now() - ts) > this.maxAgeMs) {
      return { ...empty, error: "Timestamp expired or invalid" };
    }

    // 2. Reconstruct the signed message
    const bodyHash = body
      ? ethers.keccak256(ethers.toUtf8Bytes(body))
      : ethers.keccak256(ethers.toUtf8Bytes(""));

    const message = ethers.keccak256(
      ethers.toUtf8Bytes(timestamp + method.toUpperCase() + url + bodyHash)
    );

    // 3. Recover signer address from signature (cryptographic — can't be faked)
    let signerAddress: string;
    try {
      signerAddress = ethers.verifyMessage(ethers.getBytes(message), signature);
    } catch {
      return { ...empty, error: "Invalid signature" };
    }

    // 4. Derive the on-chain agent key from the recovered address
    const agentKey = ethers.zeroPadValue(signerAddress, 32);

    // 5. Check on-chain status (with cache)
    const { isVerified, agentId } = await this.checkOnChain(agentKey);

    if (!isVerified) {
      return {
        valid: false,
        agentAddress: signerAddress,
        agentKey,
        agentId,
        error: "Agent not verified on-chain",
      };
    }

    return { valid: true, agentAddress: signerAddress, agentKey, agentId };
  }

  /**
   * Check on-chain agent status with caching.
   */
  private async checkOnChain(
    agentKey: string
  ): Promise<{ isVerified: boolean; agentId: bigint }> {
    const cached = this.cache.get(agentKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { isVerified: cached.isVerified, agentId: cached.agentId };
    }

    const [isVerified, agentId] = await Promise.all([
      this.registry.isVerifiedAgent(agentKey) as Promise<boolean>,
      this.registry.getAgentId(agentKey) as Promise<bigint>,
    ]);

    this.cache.set(agentKey, {
      isVerified,
      agentId,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return { isVerified, agentId };
  }

  /** Clear the on-chain status cache */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Express/Connect middleware that verifies agent requests.
   *
   * Adds `req.agent` with `{ address, agentKey, agentId }` on success.
   * Returns 401 on failure.
   */
  expressMiddleware() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (req: any, res: any, next: any) => {
      const signature = req.headers[HEADERS.SIGNATURE];
      const timestamp = req.headers[HEADERS.TIMESTAMP];

      if (!signature || !timestamp) {
        res.status(401).json({ error: "Missing agent authentication headers" });
        return;
      }

      const result = await this.verify({
        signature,
        timestamp,
        method: req.method,
        url: req.originalUrl || req.url,
        body: req.body ? JSON.stringify(req.body) : undefined,
      });

      if (!result.valid) {
        res.status(401).json({ error: result.error });
        return;
      }

      req.agent = {
        address: result.agentAddress,
        agentKey: result.agentKey,
        agentId: result.agentId,
      };
      next();
    };
  }
}
