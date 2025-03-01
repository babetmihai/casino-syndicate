import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const DepositContract = await ethers.getContractFactory("DepositContract");
  const depositContract = await DepositContract.deploy();

  await depositContract.waitForDeployment();
  console.log("DepositContract deployed to:", await depositContract.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });