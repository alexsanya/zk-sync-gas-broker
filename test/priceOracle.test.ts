import { getWallet, deployContract, LOCAL_RICH_WALLETS } from '../deploy/utils';

describe('PriceOracleTest', function () {
  it("Should return correct price", async function () {
    const wallet = getWallet(LOCAL_RICH_WALLETS[0].privateKey);

    const priceOracleAddress = "0xE6E839fec88eFc835F66139f0baC35a596D6d8eD";
    const usdcEthPriceFeedAddress = "0x6D41d1dc818112880b40e26BD6FD347E41008eDA";
    const priceOracleTest = await deployContract(
      "PriceOracleTest",
      [priceOracleAddress],
      { wallet, silent: true }
    );
    const chainlinkPriceFeed = await deployContract(
      "ChainlinkPriceFeed",
      [usdcEthPriceFeedAddress],
      { wallet, silent: true }
    );


    const recordPriceTx = await priceOracleTest.recordPrice(100 * 1e6);
    await recordPriceTx.wait();
    const value = await priceOracleTest.prices(0);
    const ethPrice = await chainlinkPriceFeed.getEthPriceInUsd();
    console.log(
      `100 USDC is equal to ${value} of wei worth of ` +
      `${Number(BigInt(value)*BigInt(ethPrice)/10n**18n) / 100}`
    );
    console.log(`1 ETH is equal to ${ethPrice / 100} of USD`);
  });
});
