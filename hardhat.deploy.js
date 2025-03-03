const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');


async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // The network is automatically selected based on the --network flag when running the script
  // For example: npx hardhat run hardhat.deploy.js --network localhost
  // The network configuration comes from your hardhat.config.js file
  
  const DepositContract = await ethers.getContractFactory("DepositContract");
  const depositContract = await DepositContract.deploy();
  
  // If you need to explicitly use a specific provider/network:
  // const provider = ethers.provider; // This is the provider for the selected network
  console.log("Deploying to network:", network.name);

  await depositContract.waitForDeployment();
  console.log("DepositContract deployed to:", await depositContract.getAddress());
  // Save the contract address to .env file
  
  const contractAddress = await depositContract.getAddress();
  
  // Path to .env file
  const envPath = path.resolve(__dirname, './.env');
  
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

// Function to extract and save ABI to frontend/public
async function saveAbiToFrontend(contractName) {
  try {
    // Path to the artifact file
    const artifactPath = path.resolve(__dirname, `./artifacts/contracts/${contractName}.sol/${contractName}.json`);
    
    // Read the artifact file
    const artifactRaw = fs.readFileSync(artifactPath, 'utf8');
    const artifact = JSON.parse(artifactRaw);
    
    // Extract the ABI
    const abi = artifact.abi;
    
    // Create frontend/public directory if it doesn't exist
    const publicDir = path.resolve(__dirname, './app/public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Save the ABI to frontend/public
    const abiPath = path.resolve(publicDir, `${contractName}.json`);
    fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
    
    console.log(`ABI saved to: ${abiPath}`);
  } catch (error) {
    console.error(`Error saving ABI: ${error}`);
  }
}


main()
  .then(() => saveAbiToFrontend("DepositContract"))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });