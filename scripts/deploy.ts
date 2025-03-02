import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const DepositContract = await ethers.getContractFactory("DepositContract");
  const depositContract = await DepositContract.deploy();

  await depositContract.waitForDeployment();
  console.log("DepositContract deployed to:", await depositContract.getAddress());
  // Save the contract address to .env file
  const fs = require('fs');
  const path = require('path');
  
  const contractAddress = await depositContract.getAddress();
  
  // Path to .env file
  const envPath = path.resolve(__dirname, '../frontend/.env');
  
  // Check if .env file exists
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  

  // Update or add CONTRACT_ADDRESS to frontend .env
  if (envContent.includes('VITE_CONTRACT_ADDRESS=')) {
    envContent = envContent.replace(
      /VITE_CONTRACT_ADDRESS=.*/,
      `VITE_CONTRACT_ADDRESS=${contractAddress}`
    );
  } else {
    envContent += `\VITE_CONTRACT_ADDRESS=${contractAddress}`;
  }
  
  // Write back to .env file
  fs.writeFileSync(envPath, envContent);
  console.log(`Contract address saved to .env: CONTRACT_ADDRESS=${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });