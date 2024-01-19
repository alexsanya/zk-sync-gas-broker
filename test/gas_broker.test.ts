import { getWallet, getProvider, deployContract, LOCAL_RICH_WALLETS } from '../deploy/utils';
import {
  usdt,
  USDT_ADDRESS,
  fundWithUSDT,
  getPermit,
  getReward
} from './utils';

const USDC_ETH_PRICE_FEED_ADDRESS = "0x6D41d1dc818112880b40e26BD6FD347E41008eDA";
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
    const ethBalanceBefore = await signer.getBalance();
    const usdtBalanceBefore = await usdt.balanceOf(signer.address);
    console.log('Signer`s ETH balance is: ', ethBalanceBefore.toString());
    console.log('Signer`s USDT balance is ', usdtBalanceBefore.toString());


    //deploy gas broker
    const gasBroker = await deployContract(
      "GasBroker",
      [USDC_ETH_PRICE_FEED_ADDRESS],
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


    const rewardMessage = {
      permitHash: ethers.utils.keccak256(permitMessageSignature),
      value: REWARD_VALUE
    };
    const rewardMessageSignature = await signer._signTypedData(reward.domain, reward.types, rewardMessage);

    console.log('Reward domain:', reward.domain);
    console.log('Reward message:', rewardMessage);
    console.log({ rewardMessageSignature });


    const permitSig = ethers.utils.splitSignature(permitMessageSignature);
    const rewardSig = ethers.utils.splitSignature(rewardMessageSignature);

    console.log(permitSig);
    console.log(rewardSig);

    const swapParams = [
      message.owner,
      usdt.address,
      message.value,
      message.deadline,
      REWARD_VALUE,
      permitSig.v,
      permitSig.r,
      permitSig.s,
      rewardSig.v,
      rewardSig.r,
      rewardSig.s,
      { value: 10n**18n }
    ]
    console.log('Swap params:', swapParams);
    await gasBroker.connect(wallet).swap(...swapParams);

    const nonceAfter = await usdt.nonces(signer.address);
    console.log('Nonce after: ', nonceAfter);

    const usdtBalanceAfter = await usdt.balanceOf(signer.address);
    const ethBalanceAfter = await signer.getBalance();

    console.log({
      usdtBalanceDiff: (usdtBalanceBefore - usdtBalanceAfter).toString(),
      ethBalanceAfter: (ethBalanceAfter - ethBalanceBefore).toString()
    })

    // lets change 100 USDC to ETH
  })
});
