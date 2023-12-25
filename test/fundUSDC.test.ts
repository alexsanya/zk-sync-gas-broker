import { ethers } from "hardhat";
import { getWallet, getProvider, deployContract, LOCAL_RICH_WALLETS } from '../deploy/utils';
const classicPoolFactoryAbi = require('../abis/classicPoolFactoryAbi.json')

const SYNC_SWAP_CLASSIC_POOL_FACTORY = "0xf2DAd89f2788a8CD54625C60b55cD3d2D0ACa7Cb";
const WETH_ADDRESS = "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91";
const USDC_ADDRESS = "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";


describe('FundUSDCTest', function () {
  it("Should fund wallet using SyncSwap", async function () {
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

    if (poolAddress === ZERO_ADDRESS) {
        throw Error('Pool not exists');
    }
  });
});
