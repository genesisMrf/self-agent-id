import { CELO_SEPOLIA_CHAIN_ID, CELO_SEPOLIA_CONFIG } from "./constants";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

export async function connectWallet(): Promise<string | null> {
  if (typeof window === "undefined" || !window.ethereum) {
    alert("Please install MetaMask or another wallet");
    return null;
  }

  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];

  // Switch to Celo Sepolia
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CELO_SEPOLIA_CHAIN_ID }],
    });
  } catch (switchError: unknown) {
    if ((switchError as { code: number }).code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [CELO_SEPOLIA_CONFIG],
      });
    }
  }

  return accounts[0]?.toLowerCase() || null;
}
