// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import './PriceOracle.sol';

interface IWeth {
  function deposit() external payable;
  function approve(address,uint256) external;
}

interface IPool {
  function swap(
      address recipient,
      uint256 amount,
      bool tokenAIn,
      bool exactOutput,
      uint256 sqrtPriceLimit,
      bytes calldata data
  ) external returns (uint256 amountIn, uint256 amountOut);
}

contract PriceOracleTest is IPriceOracleClient {
  uint256[] public prices;
  PriceOracle priceOracle;
  IPool pool = IPool(0x688ea0D07acaDD7D74eC7c729f1D0cA0dd4Bb665);
  IWeth weth = IWeth(0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91);

  constructor(address _priceOracle) {
    priceOracle = PriceOracle(_priceOracle);
  }

  function recordPrice(uint128 amount) public {
    priceOracle.getPriceInEth(amount, "");
  }

  function receivePrice(uint256 price, bytes calldata data) external {
    require(msg.sender == address(priceOracle), "Only price oracle can call this method");
    prices.push(price);
  }

  function testFlashLoanAttack() external payable {
    this.recordPrice(100_000000);
    weth.deposit{value: msg.value}();
    weth.approve(address(pool), msg.value);
    pool.swap(address(this), msg.value, true, false, 0, "");
    this.recordPrice(100_000000);
  }


}
