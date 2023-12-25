pragma solidity ^0.8.0;
pragma abicoder v2;

import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import "solmate/src/tokens/WETH.sol";

contract FundUSDC {
  address constant USDC = address(0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4);
  WETH constant weth = WETH(payable(0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91));

  ISwapRouter swapRouter = ISwapRouter(0x28731BCC616B5f51dD52CF2e4dF0E78dD1136C06);

  function swapExactOutputSingle(uint256 amountOut, uint256 amountInMaximum) external payable returns (uint256 amountIn) {
        weth.deposit{ value: msg.value }();
        TransferHelper.safeApprove(address(weth), address(swapRouter), amountInMaximum);

        ISwapRouter.ExactOutputSingleParams memory params =
            ISwapRouter.ExactOutputSingleParams({
                tokenIn: address(weth),
                tokenOut: USDC,
                fee: 500,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountOut: amountOut,
                amountInMaximum: amountInMaximum,
                sqrtPriceLimitX96: 0
            });

        // Executes the swap returning the amountIn needed to spend to receive the desired amountOut.
        amountIn = swapRouter.exactOutputSingle(params);

        // For exact output swaps, the amountInMaximum may not have all been spent.
        // If the actual amount spent (amountIn) is less than the specified maximum amount, we must refund the msg.sender and approve the swapRouter to spend 0.
        if (amountIn < amountInMaximum) {
            TransferHelper.safeApprove(address(weth), address(swapRouter), 0);
            TransferHelper.safeTransfer(address(weth), msg.sender, amountInMaximum - amountIn);
        }
    }
}
