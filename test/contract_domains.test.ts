import erc20abi from '../abis/erc20.json';
import allTokens from '../assets/allTokens.json';
import { getProvider } from '../deploy/utils';

const DOMAIN_SEPARATOR_ADDRESS = "0x5D270c0e0A7B6A8D3056EfC7bcEd24f87F02514F";

const domainSeparatorContract = new ethers.Contract(
  DOMAIN_SEPARATOR_ADDRESS,
  [
    "function getDomainSeparatorForToken(address, string) external view returns (bytes32)"
  ],
  getProvider()
);


const getTokenDomainData = async (tokenContract, tokenAddress) => {
  try {
    const actual = await tokenContract.DOMAIN_SEPARATOR();
    const expected = await domainSeparatorContract.getDomainSeparatorForToken(tokenAddress,"1");
    return {expected, actual};
  } catch (error) {
    return {
      error,
      expected: 'error',
      actual: 'error'
    };
  }
}

describe('ContractDomains', function () {
  it("Should show contract domain", async () => {

    const promises = allTokens.map(async ([tokenName, tokenAddress]) => {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        erc20abi,
        getProvider()
      );

      const { error, expected, actual } = await getTokenDomainData(tokenContract, tokenAddress);
      if (expected !== actual) {
        console.log({
          tokenName,
          actualName: await tokenContract.name(),
          tokenAddress,
          domainSeparator: {
            expected,
            actual
          }
        })
      }
    });

    await Promise.all(promises);
  });
});
