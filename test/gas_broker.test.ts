import { getWallet, getProvider, deployContract, LOCAL_RICH_WALLETS } from '../deploy/utils';
import { usdt, USDT_ADDRESS, fundWithUSDC, fundWithUSDT, getPermitTypedDataHash, splitSignature, getDigestEtalon } from './utils';

const PRICE_ORACLE_ADDRESS = "0xE6E839fec88eFc835F66139f0baC35a596D6d8eD";
const USDT_VALUE = 100n * 10n**6n;
const TTL = 3600;

describe('GasBrokerTest', function () {
  it("Should swap USDT to ETH", async () => {
    const signer = getWallet("0xf659966e1562fdec696602ac896ceec313c0572e3707d9606c8f3b470f85e15a");
    const wallet = getWallet(LOCAL_RICH_WALLETS[0].privateKey);
    // fund with USDT
    const value = 10n**18n;
    await fundWithUSDT(wallet, value);
    const usdtValue = await usdt.balanceOf(wallet.address);
    await usdt.connect(wallet).transfer(signer.address, usdtValue);
    console.log('Signer`s address is: ', signer.address);
    console.log('Signer`s ETH balance is: ', (await signer.getBalance()).toString());
    console.log('Signer`s USDT balance is ', (await usdt.balanceOf(signer.address)).toString());


    //deploy gas broker
    const gasBroker = await deployContract(
      "GasBroker",
      [324, PRICE_ORACLE_ADDRESS],
      { wallet, silent: true }
    );


    //prepare permit signature
    const provider = getProvider();
    const nonce = await usdt.nonces(signer.address);
    const { timestamp } = await provider.getBlock('latest');
    const message = {
      owner: signer.address,
      spender: gasBroker.address,
      value: USDT_VALUE,
      nonce,
      deadline: timestamp + TTL
    };
    console.log('Message: ', message);

    const domain = {
      name: await usdt.name(),
      version: "1",
      chainId: 260,
      verifyingContract: USDT_ADDRESS
    }
    console.log('Domain: ', domain);
    const digestEtalon = await getDigestEtalon(message);


    const digest = await getPermitTypedDataHash(message);
    const messageHashBytes = ethers.utils.arrayify(digestEtalon);
    console.log(messageHashBytes);
    //const flatSig = await signer.signMessage(messageHashBytes);
    const sig = signer._signingKey().signDigest(digestEtalon);
    console.log('Signature: ', sig);


    console.log('Digest: ', digest);
    console.log('Digest etalon: ', digestEtalon);
    console.log('Permit signature: ');
    console.log(sig);

    await usdt.connect(wallet).permit(
      message.owner,
      message.spender,
      message.value,
      message.deadline,
      sig.v,
      sig.r,
      sig.s
    );

    const nonceAfter = await usdt.nonces(signer.address);
    console.log('Nonce after: ', nonceAfter);

    // lets change 100 USDC to ETH
  })
});
