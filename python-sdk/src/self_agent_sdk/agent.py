"""Agent-side SDK — sign requests and check on-chain status."""
import time

import httpx
from web3 import Web3
from eth_account import Account

from .constants import NETWORKS, DEFAULT_NETWORK, REGISTRY_ABI, HEADERS, NetworkName
from .types import AgentInfo
from ._signing import compute_body_hash, compute_message, sign_message, address_to_agent_key


class SelfAgent:
    """
    Agent-side SDK for Self Agent ID.

    Usage:
        agent = SelfAgent(private_key="0x...")                    # mainnet
        agent = SelfAgent(private_key="0x...", network="testnet") # testnet

        headers = agent.sign_request("POST", "https://api.example.com/data", body='{"q":"test"}')
        response = agent.fetch("https://api.example.com/data", method="POST", body='{"q":"test"}')
    """

    def __init__(
        self,
        private_key: str,
        network: NetworkName | None = None,
        registry_address: str | None = None,
        rpc_url: str | None = None,
    ):
        net = NETWORKS[network or DEFAULT_NETWORK]
        self._rpc_url = rpc_url or net["rpc_url"]
        self._registry_address = registry_address or net["registry_address"]

        self._account = Account.from_key(private_key)
        self._private_key = private_key
        self._w3 = Web3(Web3.HTTPProvider(self._rpc_url))
        self._registry = self._w3.eth.contract(
            address=Web3.to_checksum_address(self._registry_address),
            abi=REGISTRY_ABI,
        )
        self._agent_key = address_to_agent_key(self._account.address)

    @property
    def address(self) -> str:
        return self._account.address

    @property
    def agent_key(self) -> bytes:
        return self._agent_key

    def sign_request(self, method: str, url: str, body: str | None = None) -> dict[str, str]:
        """Generate authentication headers for a request."""
        timestamp = str(int(time.time() * 1000))
        body_hash = compute_body_hash(body)
        message = compute_message(timestamp, method, url, body_hash)
        signature = sign_message(message, self._private_key)
        return {
            HEADERS["ADDRESS"]: self._account.address,
            HEADERS["SIGNATURE"]: signature,
            HEADERS["TIMESTAMP"]: timestamp,
        }

    def is_registered(self) -> bool:
        """Check if this agent is registered and verified on-chain."""
        return self._registry.functions.isVerifiedAgent(self._agent_key).call()

    def get_info(self) -> AgentInfo:
        """Get full agent info from the registry."""
        agent_id = self._registry.functions.getAgentId(self._agent_key).call()
        if agent_id == 0:
            return AgentInfo(
                address=self._account.address,
                agent_key=self._agent_key,
                agent_id=0, is_verified=False, nullifier=0, agent_count=0,
            )
        is_verified = self._registry.functions.hasHumanProof(agent_id).call()
        nullifier = self._registry.functions.getHumanNullifier(agent_id).call()
        agent_count = self._registry.functions.getAgentCountForHuman(nullifier).call()
        return AgentInfo(
            address=self._account.address,
            agent_key=self._agent_key,
            agent_id=agent_id,
            is_verified=is_verified,
            nullifier=nullifier,
            agent_count=agent_count,
        )

    def fetch(
        self, url: str, method: str = "GET",
        body: str | None = None, headers: dict[str, str] | None = None,
    ) -> httpx.Response:
        """Make an auto-signed HTTP request."""
        auth_headers = self.sign_request(method, url, body)
        all_headers = {**(headers or {}), **auth_headers}
        return httpx.request(method, url, headers=all_headers, content=body)
