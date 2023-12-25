import { ethers } from "hardhat";
import { getWallet, getProvider, deployContract, LOCAL_RICH_WALLETS } from '../deploy/utils';
import classicPoolFactoryAbi from '../abis/classicPoolFactoryAbi.json';
import classicPoolAbi from '../abis/classicPool.json';
import routerAbi from '../abis/router.json';
import erc20abi from '../abis/erc20.json';

const SYNC_SWAP_CLASSIC_POOL_FACTORY = "0xf2DAd89f2788a8CD54625C60b55cD3d2D0ACa7Cb";
const WETH_ADDRESS = "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91";
const USDC_ADDRESS = "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4";
const ROUTER_ADDRESS = "0x2da10A1e27bF85cEdD8FFb1AbBe97e53391C0295";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";


describe('FundUSDCTest', function () {
  it("Should fund wallet using SyncSwap", async function () {
    const wallet = getWallet(LOCAL_RICH_WALLETS[0].privateKey);
    // The factory of the Classic Pool.
    const classicPoolFactory = new ethers.Contract(
        SYNC_SWAP_CLASSIC_POOL_FACTORY,
        classicPoolFactoryAbi,
        getProvider()
    );

    // Gets the address of the ETH/DAI Classic Pool.
    // wETH is used internally by the pools.
    const poolAddress: string = await classicPoolFactory.getPool(WETH_ADDRESS, USDC_ADDRESS);   
    console.log('Pool address: ', poolAddress)   // Checks whether the pool exists.

    // Checks whether the pool exists.
    if (poolAddress === ZERO_ADDRESS) {
        throw Error('Pool not exists');
    }


    // Gets the reserves of the pool.
    const pool = new ethers.Contract(poolAddress, classicPoolAbi, getProvider());
    const reserves = await pool.getReserves(); // Returns tuple (uint, uint)

    // Sorts the reserves by token addresses.
    const [reserveETH, reserveUSDC] = WETH_ADDRESS < USDC_ADDRESS ? reserves : [reserves[1], reserves[0]];

    // The input amount of ETH
    const value = 10n**18n;

    console.log({ reserveETH, reserveUSDC })

    const withdrawMode = 1; // 1 or 2 to withdraw to user's wallet

    const swapData: string = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint8"],
        [WETH_ADDRESS, wallet.address, withdrawMode], // tokenIn, to, withdraw mode
    );

    // We have only 1 step.
    const steps = [{
        pool: poolAddress,
        data: swapData,
        callback: ZERO_ADDRESS, // we don't have a callback
        callbackData: '0x',
    }];

    const nativeETHAddress = ZERO_ADDRESS;

    // We have only 1 path.
    const paths = [{
        steps: steps,
        tokenIn: nativeETHAddress,
        amountIn: value,
    }];


    const usdc = new ethers.Contract(USDC_ADDRESS, erc20abi, getProvider());

    const balanceBefore = await usdc.balanceOf(wallet.address);
    console.log('USDC balance before: ', balanceBefore.toString());


    const router = new ethers.Contract(ROUTER_ADDRESS, routerAbi, getProvider());

    // Note: checks approval for ERC20 tokens.
    // The router will handle the deposit to the pool's vault account.
    const response = await router.connect(wallet).swap(
        paths, // paths
        0, // amountOutMin // Note: ensures slippage here
        BigInt(Math.floor(Date.now() / 1000)) + 1800n, // deadline // 30 minutes
        {
            value: value,
        }
    );

    await response.wait();

    const balanceAfter = await usdc.balanceOf(wallet.address);
    console.log('USDC balance after: ', balanceAfter.toString());

  });
});
