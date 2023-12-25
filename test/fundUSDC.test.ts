import { ethers } from "hardhat";
import { getWallet, deployContract, LOCAL_RICH_WALLETS } from '../deploy/utils';

describe('FundUSDCTest', function () {
  it("Should fund wallet", async function () {
    const wallet = getWallet(LOCAL_RICH_WALLETS[0].privateKey);
    const ONE_ETHER = 10n**18n;
    const USDC_ADDRESS = "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4";

    const ERC20ABI = [
      "function balanceOf(address owner) view returns (uint256)"
    ];

    const fundUSDC = await deployContract(
      "FundUSDC",
      [],
      { wallet, silent: true }
    );

    //const usdc = await ethers.getContractAt(ERC20ABI, USDC_ADDRESS);

    //const usdcBalanceBefore = await usdc.balanceOf(wallet.address);

    //console.log(`USDC balance of wallet before is ${usdcBalanceBefore}`);

    const fundUSDCtx = await fundUSDC.swapExactOutputSingle(100n * 10n**6n, ONE_ETHER, { value: ONE_ETHER });
    await fundUSDCtx.wait();

    //const usdcBalanceAfter = await usdc.balanceOf(wallet.address);
    //console.log(`USDC balance of wallet after is ${usdcBalanceAfter}`);
  });
});
