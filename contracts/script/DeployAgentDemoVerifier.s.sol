// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { AgentDemoVerifier } from "../src/AgentDemoVerifier.sol";
import { BaseScript } from "./Base.s.sol";
import { console } from "forge-std/console.sol";

/// @title DeployAgentDemoVerifier
/// @notice Deploys AgentDemoVerifier pointing to the existing SelfAgentRegistry
/// @dev Requires environment variables:
///      - PRIVATE_KEY: Deployer private key
///      - REGISTRY_ADDRESS: SelfAgentRegistry address
///        Celo Sepolia V4: 0x42CEA1b318557aDE212bED74FC3C7f06Ec52bd5b
contract DeployAgentDemoVerifier is BaseScript {
    function run() public broadcast returns (AgentDemoVerifier verifier) {
        address registryAddress = vm.envAddress("REGISTRY_ADDRESS");

        verifier = new AgentDemoVerifier(registryAddress);

        console.log("AgentDemoVerifier deployed to:", address(verifier));
        console.log("Registry:", registryAddress);
    }
}
