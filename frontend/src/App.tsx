import React, { useState, useEffect } from "react";
import Web3Modal from "web3modal";
import { ethers } from "ethers";
import DepositContractJSON from "../../artifacts/contracts/DepositContracts.sol/DepositContract.json";

const { abi: DepositContractABI } = DepositContractJSON;

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
const LOCAL_RPC_URL = "http://127.0.0.1:8545";


const App: React.FC = () => {
  // const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  // const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [depositAmount, setDepositAmount] = useState<string>("");

  const connectWallet = async () => {
    try {
      const web3Modal = new Web3Modal({
        network: LOCAL_RPC_URL,
        cacheProvider: true,
        providerOptions: {},
      });
      const instance = await web3Modal.connect();
      const provider = new ethers.BrowserProvider(instance);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, DepositContractABI, signer);
      const code = await provider.getCode(CONTRACT_ADDRESS);
      console.log("Code:", code);

      // setProvider(provider);
      // setSigner(signer);
      setContract(contract);
      const address = await signer.getAddress();
      setAccount(address);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const fetchBalance = async () => {
    if (contract && account) {
      try {
        const balance = await contract.getContractBalances();
        console.log("Balance:", balance);
        setBalance(ethers.formatEther(balance));
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      }
    }
  };

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