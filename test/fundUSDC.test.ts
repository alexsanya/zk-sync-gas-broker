import { ethers } from "hardhat";
import { getWallet, deployContract, LOCAL_RICH_WALLETS } from '../deploy/utils';
const { SwapRouter } = require('@uniswap/universal-router-sdk')
const { TradeType, Ether, Token, CurrencyAmount, Percent } = require('@uniswap/sdk-core')
const { Trade: V2Trade } = require('@uniswap/v2-sdk')
const { Pool, nearestUsableTick, TickMath, TICK_SPACINGS, FeeAmount, Trade: V3Trade, Route: RouteV3  } = require('@uniswap/v3-sdk')
const { MixedRouteTrade, Trade: RouterTrade } = require('@uniswap/router-sdk')
const IUniswapV3Pool = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json')
const JSBI = require('jsbi')
const erc20Abi = require('../abis/erc20.json')

const provider = ethers.provider;

const ETHER = Ether.onChain(260)
const WETH = new Token(1, '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91', 18, 'WETH', 'Wrapped Ether')
const USDC = new Token(1, '0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4', 6, 'USDC', 'USD Coin')


const wethContract = new ethers.Contract(WETH.address, erc20Abi)
const usdcContract = new ethers.Contract(USDC.address, erc20Abi)

async function getPool(tokenA, tokenB, feeAmount) {
    const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]

    const poolAddress = Pool.getAddress(token0, token1, feeAmount)

  console.log('Pool address: ', poolAddress);

    const contract = new ethers.Contract(poolAddress, IUniswapV3Pool.abi)

    let liquidity = await contract.liquidity()
  console.log('Liquidity: ', liquidity);

    let { sqrtPriceX96, tick } = await contract.slot0()

    liquidity = JSBI.BigInt(liquidity.toString())
    sqrtPriceX96 = JSBI.BigInt(sqrtPriceX96.toString())

    return new Pool(token0, token1, feeAmount, sqrtPriceX96, liquidity, tick, [
        {
            index: nearestUsableTick(TickMath.MIN_TICK, TICK_SPACINGS[feeAmount]),
            liquidityNet: liquidity,
            liquidityGross: liquidity,
        },
        {
            index: nearestUsableTick(TickMath.MAX_TICK, TICK_SPACINGS[feeAmount]),
            liquidityNet: JSBI.multiply(liquidity, JSBI.BigInt('-1')),
            liquidityGross: liquidity,
        },
    ])
}

function swapOptions(options) {
    return Object.assign(
        {
            slippageTolerance: new Percent(5, 100),
            recipient: RECIPIENT,
        },
        options
    )
}


function buildTrade(trades) {
    return new RouterTrade({
        v2Routes: trades
            .filter((trade) => trade instanceof V2Trade)
            .map((trade) => ({
                routev2: trade.route,
                inputAmount: trade.inputAmount,
                outputAmount: trade.outputAmount,
        })),
        v3Routes: trades
            .filter((trade) => trade instanceof V3Trade)
            .map((trade) => ({
                routev3: trade.route,
                inputAmount: trade.inputAmount,
                outputAmount: trade.outputAmount,
            })),
        mixedRoutes: trades
            .filter((trade) => trade instanceof MixedRouteTrade)
            .map((trade) => ({
                    mixedRoute: trade.route,
                    inputAmount: trade.inputAmount,
                outputAmount: trade.outputAmount,
            })),
    tradeType: trades[0].tradeType,
    })
}





describe('FundUSDCTest', function () {
  it("Should fund wallet using Uniswap", async function () {
    const wallet = getWallet(LOCAL_RICH_WALLETS[0].privateKey);
    const RECIPIENT = wallet.address;

    const WETH_USDC_V3 = await getPool(WETH, USDC, FeeAmount.HIGH)

    const inputEther = ethers.utils.parseEther('1').toString()

    const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_USDC_V3], ETHER, USDC),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
    )

    const routerTrade = buildTrade([trade])

    const opts = swapOptions({})

    const params = SwapRouter.swapERC20CallParameters(routerTrade, opts)

    let ethBalance
    let wethBalance
    let usdcBalance
    ethBalance = await provider.getBalance(RECIPIENT)
    wethBalance = await wethContract.balanceOf(RECIPIENT)
    usdcBalance = await usdcContract.balanceOf(RECIPIENT)
    console.log('---------------------------- BEFORE')
    console.log('ethBalance', ethers.utils.formatUnits(ethBalance, 18))
    console.log('wethBalance', ethers.utils.formatUnits(wethBalance, 18))
    console.log('usdcBalance', ethers.utils.formatUnits(usdcBalance, 6))

    const tx = await wallet.sendTransaction({
        data: params.calldata,
        to: '0x28731BCC616B5f51dD52CF2e4dF0E78dD1136C06',
        value: params.value,
        from: RECIPIENT,
    })

    const receipt = await tx.wait()
    console.log('---------------------------- SUCCESS?')
    console.log('status', receipt.status)

    ethBalance = await provider.getBalance(RECIPIENT)
    wethBalance = await wethContract.balanceOf(RECIPIENT)
    usdcBalance = await usdcContract.balanceOf(RECIPIENT)
    console.log('---------------------------- AFTER')
    console.log('ethBalance', ethers.utils.formatUnits(ethBalance, 18))
    console.log('wethBalance', ethers.utils.formatUnits(wethBalance, 18))
    console.log('usdcBalance', ethers.utils.formatUnits(usdcBalance, 6))

  });
});
