import { getWallet, getProvider, deployContract, LOCAL_RICH_WALLETS } from '../deploy/utils';
import {
  usdt,
  USDT_ADDRESS,
  fundWithUSDT,
  getPermit,
  getReward
} from './utils';

const PRICE_ORACLE_ADDRESS = "0xE6E839fec88eFc835F66139f0baC35a596D6d8eD";
const USDT_VALUE = 100n * 10n**6n;
const REWARD_VALUE = 5n* 10n**5n;
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
    const { chainId } = await provider.getNetwork();
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


    const permit = await getPermit();
    const reward = await getReward(gasBroker);

    const permitMessageSignature = await signer._signTypedData(permit.domain, permit.types, message);

    console.log({ permitMessageSignature });


    const rewardMessageSignature = await signer._signTypedData(reward.domain, reward.types, {
      permitHash: ethers.utils.keccak256(permitMessageSignature),
      value: REWARD_VALUE
    });

    const sig = ethers.utils.splitSignature(permitMessageSignature);

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
