import { getWallet, deployContract, LOCAL_RICH_WALLETS } from '../deploy/utils';
import { usdc, fundWithUSDC } from './utils';

describe('GasBrokerTest', function () {
  it("Should swap USDC to ETH", async () => {
    const signer = getWallet("0xf659966e1562fdec696602ac896ceec313c0572e3707d9606c8f3b470f85e15a");
    const wallet = getWallet(LOCAL_RICH_WALLETS[0].privateKey);
    // fund with USDC
    const value = 10n**18n;
    await fundWithUSDC(wallet, value);
    const usdcValue = await usdc.balanceOf(wallet.address);
    await usdc.connect(wallet).transfer(signer.address, usdcValue);
    console.log('Signer`s address is: ', signer.address);
    console.log('Signer`s ETH balance is: ', (await signer.getBalance()).toString());
    console.log('Signer`s USDC balance is ', (await usdc.balanceOf(signer.address)).toString());

    // lets change 100 USDC to ETH
  })
});
