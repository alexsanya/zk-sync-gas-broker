// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface AggregatorV3Interface {
  function decimals() external view returns (uint8);

  function latestRoundData()
    external
    view
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    );
}

contract ChainlinkPriceFeed {
  AggregatorV3Interface immutable ethPriceFeed;

  constructor(address _ethPriceFeed) {
    ethPriceFeed = AggregatorV3Interface(_ethPriceFeed);
  }

  function getEthPriceInUsd() external view returns (uint256 ethPrice) {
    ethPrice = chainlinkPrice(ethPriceFeed) / 10**6;
  }

  function chainlinkPrice(AggregatorV3Interface priceFeed) internal view returns (uint256) {
    (
        /* uint80 roundID */,
        int price,
        /*uint startedAt*/,
        /*uint timeStamp*/,
        /*uint80 answeredInRound*/
    ) = priceFeed.latestRoundData();
    return uint256(price);
  }
}
