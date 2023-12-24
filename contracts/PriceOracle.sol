// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPoolInformation {
  function calculateSwap(address pool, uint128 amount, bool tokenAIn, bool exactOutput, uint256 sqrtPriceLimit) external returns (uint256 returnAmount);
}

interface IPriceOracleClient {
  function receivePrice(uint256 price, bytes calldata data) external;
}

contract PriceOracle {

  address public pool;
  address public poolInfo;

  constructor(address _poolInfo, address _pool) {
    poolInfo = _poolInfo;
    pool = _pool;
  }

  function getPriceInEth(uint128 amount, bytes calldata data) external {
    uint256 price = IPoolInformation(poolInfo).calculateSwap(pool,amount,true,false,0);
    IPriceOracleClient(msg.sender).receivePrice(price, data);
  }
}


