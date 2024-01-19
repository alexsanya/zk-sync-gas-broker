import { ethers } from "hardhat";
import {
  SYNC_SWAP_CLASSIC_POOL_FACTORY,
  WETH_ADDRESS,
  USDT_ADDRESS,
  ZERO_ADDRESS,
  ROUTER_ADDRESS
} from './config';
import classicPoolFactoryAbi from '../abis/classicPoolFactoryAbi.json';
import classicPoolAbi from '../abis/classicPool.json';
import erc20abi from '../abis/erc20.json';
import routerAbi from '../abis/router.json';
import { getWallet, getProvider, deployContract, LOCAL_RICH_WALLETS } from '../deploy/utils';


const provider = getProvider();
const usdt = new ethers.Contract(USDT_ADDRESS, erc20abi, provider);
const weth = new ethers.Contract(WETH_ADDRESS, erc20abi, provider);

async function getPoolAddress() {
  // The factory of the Classic Pool.
  const classicPoolFactory = new ethers.Contract(
      SYNC_SWAP_CLASSIC_POOL_FACTORY,
      classicPoolFactoryAbi,
      getProvider()
  );

  // Gets the address of the ETH/DAI Classic Pool.
  // wETH is used internally by the pools.
  const poolAddress: string = await classicPoolFactory.getPool(WETH_ADDRESS, USDT_ADDRESS);   
  console.log('Pool address: ', poolAddress)   // Checks whether the pool exists.

  // Checks whether the pool exists.
  if (poolAddress === ZERO_ADDRESS) {
      throw Error('Pool not exists');
  }

  return poolAddress;
}

async function fundWithUSDT(wallet, value) {

    const poolAddress = await getPoolAddress();


    // Gets the reserves of the pool.
    const pool = new ethers.Contract(poolAddress, classicPoolAbi, getProvider());
    const reserves = await pool.getReserves(); // Returns tuple (uint, uint)

    // Sorts the reserves by token addresses.
    const [reserveETH, reserveUSDT] = WETH_ADDRESS < USDT_ADDRESS ? reserves : [reserves[1], reserves[0]];

    console.log({ reserveETH, reserveUSDT })

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

    console.log('Address: ', wallet.address);
    const balanceBefore = await usdt.balanceOf(wallet.address);
    console.log('USDT balance before: ', balanceBefore.toString());


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

    const balanceAfter = await usdt.balanceOf(wallet.address);
    console.log('USDT balance after: ', balanceAfter.toString());
}

async function swapBackToETH(wallet) {
  const poolAddress = await getPoolAddress();

  // Gets the reserves of the pool.
  const pool = new ethers.Contract(poolAddress, classicPoolAbi, getProvider());


  const withdrawMode = 1; // 1 or 2 to withdraw to user's wallet

  const swapData: string = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint8"],
      [USDT_ADDRESS, wallet.address, withdrawMode], // tokenIn, to, withdraw mode
  );

  // We have only 1 step.
  const steps = [{
      pool: poolAddress,
      data: swapData,
      callback: ZERO_ADDRESS, // we don't have a callback
      callbackData: '0x',
  }];

  console.log('Address: ', wallet.address);
  const balanceBefore = await usdt.balanceOf(wallet.address);
  console.log('USDT balance before: ', balanceBefore.toString());

  // We have only 1 path.
  const paths = [{
      steps: steps,
      tokenIn: USDT_ADDRESS,
      amountIn: balanceBefore,
  }];

  // approve USDT spending for router
  const approveTx = await usdt.connect(wallet).approve(ROUTER_ADDRESS, balanceBefore);
  await approveTx.wait();
  const router = new ethers.Contract(ROUTER_ADDRESS, routerAbi, getProvider());
  const ethBalanceBefore = await provider.getBalance(wallet.address);

  // Note: checks approval for ERC20 tokens.
  // The router will handle the deposit to the pool's vault account.
  const response = await router.connect(wallet).swap(
      paths, // paths
      0, // amountOutMin // Note: ensures slippage here
      BigInt(Math.floor(Date.now() / 1000)) + 1800n // deadline // 30 minutes
  );

  await response.wait();

  const balanceAfter = await usdt.balanceOf(wallet.address);
  console.log('USDT balance after: ', balanceAfter.toString());
  console.log('WETH balance after: ', await weth.balanceOf(wallet.address));
  const ethBalanceAfter = await provider.getBalance(wallet.address);
  console.log('ETH ballance diff: ', ethBalanceAfter - ethBalanceBefore);
}

describe('SwapBackTest', function () {
  it("Should swap tokens back to gas", async function () {
    const wallet = getWallet(LOCAL_RICH_WALLETS[0].privateKey);
    await fundWithUSDT(wallet, 10n**18n);
    await swapBackToETH(wallet);
  })
})
