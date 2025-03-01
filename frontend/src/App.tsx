import React, { useState, useEffect } from "react";
import Web3Modal from "web3modal";
import { ethers } from "ethers";
import DepositContractJSON from "../../artifacts/contracts/DepositContracts.sol/DepositContract.json";

const { abi: DepositContractABI } = DepositContractJSON;


// Replace this with the address from your local deployment (e.g., from deploy.ts output)
const CONTRACT_ADDRESS = "0xYourLocalContractAddress"; // Example: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
const LOCAL_RPC_URL = "http://127.0.0.1:8545";

const App: React.FC = () => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [depositAmount, setDepositAmount] = useState<string>("");

  // Connect to MetaMask using Web3Modal
  const connectWallet = async () => {
    try {
      const web3Modal = new Web3Modal({
        network: "localhost", // Hardhat local network
        cacheProvider: true,
        providerOptions: {},
      });
      const instance = await web3Modal.connect();
      const provider = new ethers.BrowserProvider(instance);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, DepositContractABI, signer);

      setProvider(provider);
      setSigner(signer);
      setContract(contract);
      const address = await signer.getAddress();
      setAccount(address);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  // Fetch the user's balance from the contract
  const fetchBalance = async () => {
    if (contract && account) {
      try {
        const balance = await contract.balances(account);
        setBalance(ethers.formatEther(balance));
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      }
    }
  };

  // Deposit funds into the contract
  const depositFunds = async () => {
    if (contract && depositAmount) {
      try {
        const tx = await contract.deposit({
          value: ethers.parseEther(depositAmount),
        });
        await tx.wait();
        fetchBalance();
        setDepositAmount("");
      } catch (error) {
        console.error("Failed to deposit:", error);
      }
    }
  };

  // Fetch balance when account or contract changes
  useEffect(() => {
    if (account && contract) {
      fetchBalance();
    }
  }, [account, contract]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Deposit App (Hardhat Local)</h1>
      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>
          <p>Connected Account: {account}</p>
          <p>Your Balance: {balance} ETH</p>
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Amount in ETH"
          />
          <button onClick={depositFunds}>Deposit</button>
        </div>
      )}
    </div>
  );
};

export default App;