import { deployContract } from "./utils";

// An example of a basic deploy script
// It will deploy a Greeter contract to selected network
// as well as verify it on Block Explorer if possible for the network
export default async function () {
  const contractArtifactName = "PriceOracle";
  const constructorArguments = [
    "0x57D47F505EdaA8Ae1eFD807A860A79A28bE06449",
    "0x688ea0D07acaDD7D74eC7c729f1D0cA0dd4Bb665"
  ];
  await deployContract(contractArtifactName, constructorArguments);
}
