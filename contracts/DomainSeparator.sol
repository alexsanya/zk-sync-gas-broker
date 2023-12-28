// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface Token {
  function name() external view returns (string memory);
}

contract DomainSeparator {
  function getDomainSeparatorForToken(address _token, string calldata version) external view returns (bytes32) {
      bytes32 typeHash = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
      bytes32 nameHash = keccak256(bytes(Token(_token).name()));
      bytes32 versionHash = keccak256(bytes(version));
      return keccak256(abi.encode(typeHash, nameHash, versionHash, block.chainid, _token));
  }

  function getChainId() external view returns (uint256) {
      return block.chainid;
  }
}
