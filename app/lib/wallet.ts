// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Eip1193Provider } from "ethers";
import type { NetworkConfig } from "./network";

export async function connectWallet(
  network: NetworkConfig,
): Promise<string | null> {
  if (typeof window === "undefined" || !window.ethereum) {
    alert("Please install MetaMask or another wallet");
    return null;
  }

  const eth = window.ethereum as unknown as Eip1193Provider;

  const accounts = (await eth.request({
    method: "eth_requestAccounts",
  })) as string[];

  // Switch to the selected network
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: network.chainIdHex }],
    });
  } catch (switchError: unknown) {
    if ((switchError as { code: number }).code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: network.chainIdHex,
            chainName: network.isTestnet ? "Celo Sepolia Testnet" : "Celo",
            nativeCurrency: network.nativeCurrency,
            rpcUrls: [network.rpcUrl],
            blockExplorerUrls: [network.blockExplorer],
          },
        ],
      });
    }
  }

  return accounts[0]?.toLowerCase() || null;
}
