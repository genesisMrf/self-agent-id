// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Test } from "forge-std/Test.sol";
import { SelfAgentRegistry } from "../src/SelfAgentRegistry.sol";
import { SelfHumanProofProvider } from "../src/SelfHumanProofProvider.sol";
import { MockHumanProofProvider } from "./mocks/MockHumanProofProvider.sol";
import { ISelfVerificationRoot } from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import { IIdentityVerificationHubV2 } from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";
import { IERC8004ProofOfHuman } from "../src/interfaces/IERC8004ProofOfHuman.sol";

contract SelfAgentRegistryTest is Test {
    SelfAgentRegistry registry;
    SelfHumanProofProvider selfProvider;
    MockHumanProofProvider mockProvider;

    address owner = makeAddr("owner");
    address hubMock = makeAddr("hub");
    address human1 = makeAddr("human1");
    address human2 = makeAddr("human2");

    bytes32 fakeConfigId = bytes32(uint256(0xc0de));

    bytes32 agentKey1 = keccak256("agent-key-1");
    bytes32 agentKey2 = keccak256("agent-key-2");
    bytes32 agentKey3 = keccak256("agent-key-3");

    uint256 nullifier1 = 111111;
    uint256 nullifier2 = 222222;

    // ====================================================
    // Setup — adapted from boilerplate/self-lottery pattern:
    //   mock hub.setVerificationConfigV2() → return fakeConfigId
    // ====================================================

    function setUp() public {
        // Mock the hub's setVerificationConfigV2 to return a fake configId
        // This is called in the SelfAgentRegistry constructor
        vm.mockCall(
            hubMock,
            abi.encodeWithSelector(IIdentityVerificationHubV2.setVerificationConfigV2.selector),
            abi.encode(fakeConfigId)
        );

        registry = new SelfAgentRegistry(hubMock, owner);
        selfProvider = new SelfHumanProofProvider(hubMock, registry.scope());
        mockProvider = new MockHumanProofProvider();

        // Owner sets up providers
        vm.startPrank(owner);
        registry.setSelfProofProvider(address(selfProvider));
        registry.addProofProvider(address(mockProvider));
        vm.stopPrank();
    }

    // ====================================================
    // Helpers — build mock Hub V2 callback data
    //   Pattern: vm.prank(hubMock) → registry.onVerificationSuccess(encodedOutput, userData)
    //   Adapted from TestSelfVerificationRoot in Self SDK
    // ====================================================

    function _buildEncodedOutput(
        address humanAddr,
        uint256 nullifier
    ) internal pure returns (bytes memory) {
        string[] memory names = new string[](3);
        names[0] = "ALICE";
        names[1] = "";
        names[2] = "SMITH";

        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output = ISelfVerificationRoot
            .GenericDiscloseOutputV2({
                attestationId: bytes32(uint256(1)), // E_PASSPORT
                userIdentifier: uint256(uint160(humanAddr)),
                nullifier: nullifier,
                forbiddenCountriesListPacked: [uint256(0), uint256(0), uint256(0), uint256(0)],
                issuingState: "GBR",
                name: names,
                idNumber: "123456789",
                nationality: "GBR",
                dateOfBirth: "950101",
                gender: "F",
                expiryDate: "300101",
                olderThan: 0,
                ofac: [false, false, false]
            });

        return abi.encode(output);
    }

    function _buildUserData(uint8 action, bytes32 agentPubKey) internal pure returns (bytes memory) {
        return abi.encodePacked(action, agentPubKey);
    }

    function _registerViaHub(address humanAddr, uint256 nullifier, bytes32 agentPubKey) internal {
        bytes memory encodedOutput = _buildEncodedOutput(humanAddr, nullifier);
        bytes memory userData = _buildUserData(0x01, agentPubKey);
        vm.prank(hubMock);
        registry.onVerificationSuccess(encodedOutput, userData);
    }

    function _deregisterViaHub(address humanAddr, uint256 nullifier, bytes32 agentPubKey) internal {
        bytes memory encodedOutput = _buildEncodedOutput(humanAddr, nullifier);
        bytes memory userData = _buildUserData(0x02, agentPubKey);
        vm.prank(hubMock);
        registry.onVerificationSuccess(encodedOutput, userData);
    }

    // ====================================================
    // Constructor
    // ====================================================

    function test_Constructor() public view {
        assertEq(registry.name(), "Self Agent ID");
        assertEq(registry.symbol(), "SAID");
        assertEq(registry.owner(), owner);
        assertEq(registry.verificationConfigId(), fakeConfigId);
    }

    function test_GetConfigId_ReturnsStoredId() public view {
        bytes32 result = registry.getConfigId(bytes32(0), bytes32(0), "");
        assertEq(result, fakeConfigId);
    }

    // ====================================================
    // Hub V2 Callback — Registration
    // ====================================================

    function test_RegisterAgent_ViaHub() public {
        _registerViaHub(human1, nullifier1, agentKey1);

        uint256 agentId = registry.getAgentId(agentKey1);
        assertEq(agentId, 1, "First agent should have ID 1");
        assertTrue(registry.hasHumanProof(agentId));
        assertEq(registry.getHumanNullifier(agentId), nullifier1);
        assertEq(registry.getProofProvider(agentId), address(selfProvider));
        assertEq(registry.getAgentCountForHuman(nullifier1), 1);
        assertEq(registry.agentRegisteredAt(agentId), block.number);
        assertTrue(registry.isVerifiedAgent(agentKey1));
    }

    function test_RegisterAgent_MintToHumanAddress() public {
        _registerViaHub(human1, nullifier1, agentKey1);

        uint256 agentId = registry.getAgentId(agentKey1);
        assertEq(registry.ownerOf(agentId), human1, "NFT should be minted to the human's address");
    }

    function test_RegisterAgent_EmitsEvent() public {
        bytes memory encodedOutput = _buildEncodedOutput(human1, nullifier1);
        bytes memory userData = _buildUserData(0x01, agentKey1);

        vm.expectEmit(true, true, false, true);
        emit IERC8004ProofOfHuman.AgentRegisteredWithHumanProof(
            1, // agentId
            address(selfProvider),
            nullifier1,
            100 // Self Protocol verification strength
        );

        vm.prank(hubMock);
        registry.onVerificationSuccess(encodedOutput, userData);
    }

    function test_RegisterMultipleAgents_SameHuman() public {
        _registerViaHub(human1, nullifier1, agentKey1);
        _registerViaHub(human1, nullifier1, agentKey2);

        assertEq(registry.getAgentCountForHuman(nullifier1), 2);
        assertTrue(registry.sameHuman(
            registry.getAgentId(agentKey1),
            registry.getAgentId(agentKey2)
        ));
    }

    function test_RegisterAgents_DifferentHumans() public {
        _registerViaHub(human1, nullifier1, agentKey1);
        _registerViaHub(human2, nullifier2, agentKey2);

        assertEq(registry.getAgentCountForHuman(nullifier1), 1);
        assertEq(registry.getAgentCountForHuman(nullifier2), 1);
        assertFalse(registry.sameHuman(
            registry.getAgentId(agentKey1),
            registry.getAgentId(agentKey2)
        ));
    }

    function test_RegisterAgent_IncrementalIds() public {
        _registerViaHub(human1, nullifier1, agentKey1);
        _registerViaHub(human2, nullifier2, agentKey2);

        assertEq(registry.getAgentId(agentKey1), 1);
        assertEq(registry.getAgentId(agentKey2), 2);
    }

    function test_RevertWhen_DuplicateAgentKey() public {
        _registerViaHub(human1, nullifier1, agentKey1);

        bytes memory encodedOutput = _buildEncodedOutput(human1, nullifier1);
        bytes memory userData = _buildUserData(0x01, agentKey1);

        vm.prank(hubMock);
        vm.expectRevert(abi.encodeWithSelector(SelfAgentRegistry.AgentAlreadyRegistered.selector, agentKey1));
        registry.onVerificationSuccess(encodedOutput, userData);
    }

    function test_RevertWhen_InvalidUserDataTooShort() public {
        bytes memory encodedOutput = _buildEncodedOutput(human1, nullifier1);
        bytes memory shortData = abi.encodePacked(uint8(0x01)); // only 1 byte, need 33

        vm.prank(hubMock);
        vm.expectRevert(SelfAgentRegistry.InvalidUserData.selector);
        registry.onVerificationSuccess(encodedOutput, shortData);
    }

    function test_RevertWhen_InvalidAction() public {
        bytes memory encodedOutput = _buildEncodedOutput(human1, nullifier1);
        bytes memory userData = _buildUserData(0xFF, agentKey1);

        vm.prank(hubMock);
        vm.expectRevert(abi.encodeWithSelector(SelfAgentRegistry.InvalidAction.selector, uint8(0xFF)));
        registry.onVerificationSuccess(encodedOutput, userData);
    }

    function test_RevertWhen_CallerNotHub() public {
        bytes memory encodedOutput = _buildEncodedOutput(human1, nullifier1);
        bytes memory userData = _buildUserData(0x01, agentKey1);

        vm.prank(human1); // not the hub
        vm.expectRevert(); // UnauthorizedCaller from SelfVerificationRoot
        registry.onVerificationSuccess(encodedOutput, userData);
    }

    // ====================================================
    // Hub V2 Callback — Deregistration
    // ====================================================

    function test_DeregisterAgent_ViaHub() public {
        _registerViaHub(human1, nullifier1, agentKey1);

        uint256 agentId = registry.getAgentId(agentKey1);
        assertEq(registry.ownerOf(agentId), human1);

        _deregisterViaHub(human1, nullifier1, agentKey1);

        assertFalse(registry.hasHumanProof(agentId));
        assertEq(registry.getAgentCountForHuman(nullifier1), 0);
        assertFalse(registry.isVerifiedAgent(agentKey1));

        // NFT burned — ownerOf should revert
        vm.expectRevert();
        registry.ownerOf(agentId);
    }

    function test_DeregisterAgent_EmitsEvent() public {
        _registerViaHub(human1, nullifier1, agentKey1);

        bytes memory encodedOutput = _buildEncodedOutput(human1, nullifier1);
        bytes memory userData = _buildUserData(0x02, agentKey1);

        vm.expectEmit(true, false, false, true);
        emit IERC8004ProofOfHuman.HumanProofRevoked(1, nullifier1);

        vm.prank(hubMock);
        registry.onVerificationSuccess(encodedOutput, userData);
    }

    function test_DeregisterAgent_DecrementsCount() public {
        _registerViaHub(human1, nullifier1, agentKey1);
        _registerViaHub(human1, nullifier1, agentKey2);
        assertEq(registry.getAgentCountForHuman(nullifier1), 2);

        _deregisterViaHub(human1, nullifier1, agentKey1);
        assertEq(registry.getAgentCountForHuman(nullifier1), 1);

        // agentKey2 still active
        assertTrue(registry.isVerifiedAgent(agentKey2));
    }

    function test_RevertWhen_DeregisterUnregisteredAgent() public {
        bytes memory encodedOutput = _buildEncodedOutput(human1, nullifier1);
        bytes memory userData = _buildUserData(0x02, agentKey1);

        vm.prank(hubMock);
        vm.expectRevert(abi.encodeWithSelector(SelfAgentRegistry.AgentNotRegistered.selector, agentKey1));
        registry.onVerificationSuccess(encodedOutput, userData);
    }

    function test_RevertWhen_DeregisterByWrongHuman() public {
        _registerViaHub(human1, nullifier1, agentKey1);

        // human2 (different nullifier) tries to deregister human1's agent
        bytes memory encodedOutput = _buildEncodedOutput(human2, nullifier2);
        bytes memory userData = _buildUserData(0x02, agentKey1);

        vm.prank(hubMock);
        vm.expectRevert(
            abi.encodeWithSelector(SelfAgentRegistry.NotAgentOwner.selector, nullifier1, nullifier2)
        );
        registry.onVerificationSuccess(encodedOutput, userData);
    }

    // ====================================================
    // Synchronous Path — registerWithHumanProof
    // ====================================================

    function test_RegisterWithHumanProof_Sync() public {
        mockProvider.setNextNullifier(nullifier1);

        bytes memory proof = "mock-proof";
        bytes memory providerData = abi.encodePacked(agentKey1);

        vm.prank(human1);
        uint256 agentId = registry.registerWithHumanProof("", address(mockProvider), proof, providerData);

        assertEq(agentId, 1);
        assertTrue(registry.hasHumanProof(agentId));
        assertEq(registry.getHumanNullifier(agentId), nullifier1);
        assertEq(registry.getProofProvider(agentId), address(mockProvider));
        assertEq(registry.ownerOf(agentId), human1, "NFT minted to msg.sender in sync path");
    }

    function test_RevertWhen_SyncRegister_ProviderNotApproved() public {
        address fakeProvider = makeAddr("fake-provider");

        vm.prank(human1);
        vm.expectRevert(abi.encodeWithSelector(SelfAgentRegistry.ProviderNotApproved.selector, fakeProvider));
        registry.registerWithHumanProof("", fakeProvider, "", "");
    }

    function test_RevertWhen_SyncRegister_VerificationFails() public {
        mockProvider.setShouldVerify(false);

        bytes memory providerData = abi.encodePacked(agentKey1);

        vm.prank(human1);
        vm.expectRevert("Human proof verification failed");
        registry.registerWithHumanProof("", address(mockProvider), "", providerData);
    }

    function test_RevertWhen_SyncRegister_ProviderDataTooShort() public {
        mockProvider.setNextNullifier(nullifier1);

        vm.prank(human1);
        vm.expectRevert("Provider data must contain agent public key");
        registry.registerWithHumanProof("", address(mockProvider), "", "");
    }

    function test_RevertWhen_SyncRegister_SelfProvider() public {
        // Self provider always reverts on verifyHumanProof
        bytes memory providerData = abi.encodePacked(agentKey1);

        vm.prank(human1);
        vm.expectRevert(SelfHumanProofProvider.DirectVerificationNotSupported.selector);
        registry.registerWithHumanProof("", address(selfProvider), "", providerData);
    }

    // ====================================================
    // Synchronous Path — revokeHumanProof
    // ====================================================

    function test_RevokeHumanProof_Sync() public {
        // Register first
        mockProvider.setNextNullifier(nullifier1);
        bytes memory providerData = abi.encodePacked(agentKey1);
        vm.prank(human1);
        uint256 agentId = registry.registerWithHumanProof("", address(mockProvider), "", providerData);

        // Revoke
        vm.prank(human1);
        registry.revokeHumanProof(agentId, address(mockProvider), "", "");

        assertFalse(registry.hasHumanProof(agentId));
    }

    function test_RevertWhen_RevokeByDifferentHuman() public {
        // Register with nullifier1
        mockProvider.setNextNullifier(nullifier1);
        bytes memory providerData = abi.encodePacked(agentKey1);
        vm.prank(human1);
        uint256 agentId = registry.registerWithHumanProof("", address(mockProvider), "", providerData);

        // human2 tries to revoke (different nullifier)
        mockProvider.setNextNullifier(nullifier2);
        vm.prank(human2);
        vm.expectRevert("Not the same human");
        registry.revokeHumanProof(agentId, address(mockProvider), "", "");
    }

    function test_RevertWhen_RevokeNoHumanProof() public {
        // Agent ID 99 doesn't exist / has no proof
        vm.prank(human1);
        vm.expectRevert(abi.encodeWithSelector(SelfAgentRegistry.AgentHasNoHumanProof.selector, 99));
        registry.revokeHumanProof(99, address(mockProvider), "", "");
    }

    // ====================================================
    // View Functions
    // ====================================================

    function test_IsVerifiedAgent_Unregistered() public view {
        assertFalse(registry.isVerifiedAgent(agentKey1));
    }

    function test_GetAgentId_Unregistered() public view {
        assertEq(registry.getAgentId(agentKey1), 0);
    }

    function test_SameHuman_ZeroNullifier() public view {
        // Unregistered agents should return false (nullifier = 0)
        assertFalse(registry.sameHuman(1, 2));
    }

    // ====================================================
    // Admin — Provider Management
    // ====================================================

    function test_AddProofProvider() public {
        address newProvider = address(new MockHumanProofProvider());

        vm.prank(owner);
        registry.addProofProvider(newProvider);

        assertTrue(registry.isApprovedProvider(newProvider));
    }

    function test_RevertWhen_AddProvider_NotOwner() public {
        vm.prank(human1);
        vm.expectRevert();
        registry.addProofProvider(makeAddr("provider"));
    }

    function test_RevertWhen_AddProvider_AlreadyApproved() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(SelfAgentRegistry.ProviderAlreadyApproved.selector, address(mockProvider))
        );
        registry.addProofProvider(address(mockProvider));
    }

    function test_RemoveProofProvider() public {
        vm.prank(owner);
        registry.removeProofProvider(address(mockProvider));

        assertFalse(registry.isApprovedProvider(address(mockProvider)));
    }

    function test_RevertWhen_RemoveProvider_NotApproved() public {
        address fakeProvider = makeAddr("fake");

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(SelfAgentRegistry.ProviderNotApproved.selector, fakeProvider));
        registry.removeProofProvider(fakeProvider);
    }

    function test_SetSelfProofProvider_SwapsOldProvider() public {
        SelfHumanProofProvider newSelfProvider = new SelfHumanProofProvider(hubMock, registry.scope());

        vm.prank(owner);
        registry.setSelfProofProvider(address(newSelfProvider));

        assertEq(registry.selfProofProvider(), address(newSelfProvider));
        assertTrue(registry.isApprovedProvider(address(newSelfProvider)));
        // Old provider should be removed from whitelist
        assertFalse(registry.isApprovedProvider(address(selfProvider)));
    }

    // ====================================================
    // ERC-721 Basics
    // ====================================================

    function test_TokenName() public view {
        assertEq(registry.name(), "Self Agent ID");
    }

    function test_TokenSymbol() public view {
        assertEq(registry.symbol(), "SAID");
    }

    function test_BalanceAfterRegister() public {
        _registerViaHub(human1, nullifier1, agentKey1);
        assertEq(registry.balanceOf(human1), 1);

        _registerViaHub(human1, nullifier1, agentKey2);
        assertEq(registry.balanceOf(human1), 2);
    }

    function test_BalanceAfterDeregister() public {
        _registerViaHub(human1, nullifier1, agentKey1);
        _registerViaHub(human1, nullifier1, agentKey2);
        assertEq(registry.balanceOf(human1), 2);

        _deregisterViaHub(human1, nullifier1, agentKey1);
        assertEq(registry.balanceOf(human1), 1);
    }

    // ====================================================
    // Fuzz Tests
    // ====================================================

    function testFuzz_RegisterAgent(bytes32 agentPubKey, uint256 nullifier, address humanAddr) public {
        vm.assume(humanAddr != address(0)); // ERC721 won't mint to zero address
        vm.assume(nullifier != 0); // Non-zero nullifier
        vm.assume(agentPubKey != bytes32(0));

        _registerViaHub(humanAddr, nullifier, agentPubKey);

        uint256 agentId = registry.getAgentId(agentPubKey);
        assertTrue(agentId != 0);
        assertTrue(registry.isVerifiedAgent(agentPubKey));
        assertEq(registry.ownerOf(agentId), humanAddr);
        assertEq(registry.getHumanNullifier(agentId), nullifier);
    }

    function testFuzz_RegisterAndDeregister(bytes32 agentPubKey, uint256 nullifier, address humanAddr) public {
        vm.assume(humanAddr != address(0));
        vm.assume(nullifier != 0);
        vm.assume(agentPubKey != bytes32(0));

        _registerViaHub(humanAddr, nullifier, agentPubKey);
        uint256 agentId = registry.getAgentId(agentPubKey);
        assertTrue(registry.isVerifiedAgent(agentPubKey));

        _deregisterViaHub(humanAddr, nullifier, agentPubKey);
        assertFalse(registry.isVerifiedAgent(agentPubKey));
        assertFalse(registry.hasHumanProof(agentId));
    }
}
