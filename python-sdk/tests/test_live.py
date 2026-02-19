"""Integration tests against Celo Sepolia. Run with: pytest --slow"""
import os

import pytest
from eth_account import Account

from self_agent_sdk import SelfAgent, SelfAgentVerifier

# Use env var for registered agent, or skip
DEMO_KEY = os.environ.get("DEMO_AGENT_KEY")


@pytest.mark.slow
def test_random_agent_not_verified():
    random_key = Account.create().key.hex()
    agent = SelfAgent(private_key=random_key, network="testnet")
    assert agent.is_registered() is False


@pytest.mark.slow
@pytest.mark.skipif(not DEMO_KEY, reason="DEMO_AGENT_KEY not set")
def test_known_agent_is_verified():
    agent = SelfAgent(private_key=DEMO_KEY, network="testnet")
    assert agent.is_registered() is True


@pytest.mark.slow
@pytest.mark.skipif(not DEMO_KEY, reason="DEMO_AGENT_KEY not set")
def test_sign_and_verify_round_trip():
    agent = SelfAgent(private_key=DEMO_KEY, network="testnet")
    verifier = SelfAgentVerifier(network="testnet")
    headers = agent.sign_request("POST", "/test", body='{"x":1}')
    result = verifier.verify(
        signature=headers["x-self-agent-signature"],
        timestamp=headers["x-self-agent-timestamp"],
        method="POST", url="/test", body='{"x":1}',
    )
    assert result.valid is True
    assert result.agent_address.lower() == agent.address.lower()
