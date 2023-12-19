// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct TwaState {
    int96 twa;
    int96 value;
    uint64 lastTimestamp;
}

interface IPool {
    function getTwa() external view returns (TwaState memory);
    function getCurrentTwa() external view returns (int256);
    function tokenA() external view returns (address);
    function tokenB() external view returns (address);
}

interface IPoolInformation {
    function calculateSwap(address pool, uint128 amount, bool tokenAIn, bool exactOutput, uint256 sqrtPriceLimit) external returns (uint256 returnAmount);
}

contract ShowSwapAmount {
    uint256 public foo;
    IPoolInformation poolInfo = IPoolInformation(0x57D47F505EdaA8Ae1eFD807A860A79A28bE06449);

    function proxy(uint128 amount) external {
        foo = poolInfo.calculateSwap(0x688ea0D07acaDD7D74eC7c729f1D0cA0dd4Bb665,amount,true,false,0);
    }
}
// Token A is USDT
// Token B is WBNB
// 5 USDT exchanged to 20851 WBNB


