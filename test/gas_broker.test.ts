import { getWallet, getProvider, deployContract, LOCAL_RICH_WALLETS } from '../deploy/utils';
import { usdc, fundWithUSDC, getPermitTypedDataHash, splitSignature, getDigestEtalon } from './utils';

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

    const messageHashBytes = ethers.utils.arrayify("0xd12e658b4f72d593ac7e25f9ce92ad3df2a3239a7aa63a9214a403babf9d44bd");
    console.log(messageHashBytes);
    const flatSig = await signer.signMessage(messageHashBytes);
    const sig = ethers.utils.splitSignature(flatSig);

    console.log('Signature: ', sig);



    const digest = await getPermitTypedDataHash(message);
    const digestEtalon = await getDigestEtalon({

        owner: "0x5d2fcc71dFf7182bf49927a2ed3C8FcE0De87723",
        spender: "0x4B5DF730c2e6b28E17013A1485E5d9BC41Efe021",
        value: 100000000n,
        deadline: 1703639975n,
        nonce: 0
    });
    const permitSignature = await signer.signMessage(digestEtalon);

    console.log('Digest: ', digest);
    console.log('Digest etalon: ', digestEtalon);
    console.log('Permit signature: ', permitSignature);

    const [permitV, permitR, permitS] = splitSignature(permitSignature);

    console.log({
      permitV,
      permitR,
      permitS
    });

      await usdc.connect(wallet).permit(
        "0x5d2fcc71dFf7182bf49927a2ed3C8FcE0De87723",
        "0x4B5DF730c2e6b28E17013A1485E5d9BC41Efe021",
        100000000n,
        1703639975n,
        "0x1c",
        "0x09bfaa3103d5bee140ca7062e8cd02e0560a4e35852b7ad3a45a54ff3b2aae79",
        "0x1526153f1f1ca1008c9b70f4f283d3c8b36694db721f167f0c6c4162a05061a0"
      );

 //   await usdc.connect(wallet).permit(message.owner, message.spender, message.value, message.deadline, permitV, permitR, permitS);

    const nonceAfter = await usdc.nonces(signer.address);
    console.log('Nonce after: ', nonceAfter);

    // lets change 100 USDC to ETH
  })
});
