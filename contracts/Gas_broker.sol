// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "solmate/src/tokens/ERC20.sol";

interface IPriceOracle {
  function getPriceInEth(uint128 amount, bytes calldata data) external;
}

interface IERC2612 {
  function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;
}

struct Reward {
  uint256 value;
  bytes32 permitHash; //keccak256 for permit signature
}

contract GasBroker {
  event Swap(bytes32 permitHash);

  using Address for address payable;

  string public constant name = "Gas broker";
  string public constant version = "1";

  bytes32 public immutable DOMAIN_SEPARATOR;
  IPriceOracle immutable priceOracle;

  constructor(address _priceOracle) {
    DOMAIN_SEPARATOR = keccak256(
      abi.encode(
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
        keccak256(bytes(name)),
        keccak256(bytes(version)),
        block.chainid,
        address(this)
      )
    );
    priceOracle = IPriceOracle(_priceOracle);
  }

  function swap(
    address signer,
    address token,
    uint256 value,
    uint256 deadline,
    uint256 reward,
    uint8 permitV,
    bytes32 permitR,
    bytes32 permitS,
    uint8 rewardV,
    bytes32 rewardR,
    bytes32 rewardS) external payable {
      require(value > reward, "Reward could not exceed value");

      bytes32 permitHash = keccak256(abi.encodePacked(permitR,permitS,permitV));
      require(
        verifyReward(
          signer,
          reward,
          permitHash,
          rewardV,
          rewardR,
          rewardS
        ),
        "Reward signature is invalid"
      );
      IERC2612(token).permit(
        signer,
        address(this),
        value,
        deadline,
        permitV,
        permitR,
        permitS
      );
      SafeERC20.safeTransferFrom(IERC20(token), signer, address(this), value);
      bytes memory data = abi.encode(
        signer,
        msg.sender,
        msg.value,
        token,
        value,
        permitHash
      );
      priceOracle.getPriceInEth(uint128(value - reward), data);
    }

    function receivePrice(uint256 ethAmount, bytes calldata data) external {
      require(msg.sender == address(priceOracle), "Only price oracle could call this method");
      (
        address signer,
        address originalSender,
        uint256 gasProvided,
        address token,
        uint256 value,
        bytes32 permitHash
      ) = abi.decode(
          data,
          (address,address,uint256,address,uint256,bytes32)
      );

      require(gasProvided >= ethAmount, "Not enough ETH provided");
      payable(signer).sendValue(ethAmount);
      if (gasProvided > ethAmount) {
        payable(originalSender).sendValue(gasProvided - ethAmount);
      }
      SafeERC20.safeTransfer(IERC20(token), originalSender, value);
      emit Swap(permitHash);
    }

    function hashReward(Reward memory reward) private view returns (bytes32) {
      return keccak256(
        abi.encodePacked(
          "\x19\x01",
          DOMAIN_SEPARATOR,
          keccak256(
            abi.encode(
              keccak256("Reward(uint256 value,bytes32 permitHash)"),
              reward.value,
              reward.permitHash
            )
          )
        )
      );
    }

    function verifyReward(
      address signer,
      uint256 value,
      bytes32 permitHash,
      uint8 sigV,
      bytes32 sigR,
      bytes32 sigS
    ) private view returns (bool) {
      return signer == ecrecover(hashReward(Reward(value, permitHash)), sigV, sigR, sigS);
    }
}
