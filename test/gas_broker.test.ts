import { getWallet, getProvider, deployContract, LOCAL_RICH_WALLETS } from '../deploy/utils';
import { usdc, fundWithUSDC, getPermitTypedDataHash } from './utils';

const PRICE_ORACLE_ADDRESS = "0xE6E839fec88eFc835F66139f0baC35a596D6d8eD";
const USDC_ADDRESS = "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4";
const USDC_VALUE = 100n * 10n**6n;
const TTL = 3600;

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


    //deploy gas broker
    const gasBroker = await deployContract(
      "GasBroker",
      [324, PRICE_ORACLE_ADDRESS],
      { wallet, silent: true }
    );


    //prepare permit signature
    const provider = getProvider();
    const nonce = await usdc.nonces(signer.address);
    const { timestamp } = await provider.getBlock('latest');
    const message = {
      owner: signer.address,
      spender: gasBroker.address,
      value: USDC_VALUE,
      nonce,
      deadline: timestamp + TTL
    };
    console.log(message);

    const domain = {
      name: await usdc.name(),
      version: "1",
      chainId: 324,
      verifyingContract: USDC_ADDRESS
    }


    const digest = await getPermitTypedDataHash(message);
    const permitSignature = await signer.signMessage(digest);

    console.log('Digest: ', digest);
    console.log('Permit signature: ', permitSignature);

    // lets change 100 USDC to ETH
  })
});
