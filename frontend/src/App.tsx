import React, { useState, useEffect } from "react";
import Web3Modal from "web3modal";
import { ethers } from "ethers";
import DepositContractABI from "../abi.json";

const CONTRACT_ADDRESS = "0xYourContractAddress"; // Replace with deployed address
const MUMBAI_RPC_URL = "https://rpc-mumbai.maticvigil.com";

const App: React.FC = () => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [depositAmount, setDepositAmount] = useState<string>("");

  const connectWallet = async () => {
    const web3Modal = new Web3Modal({
      network: "mumbai",
      cacheProvider: true,
    });
    const instance = await web3Modal.connect();
    const provider = new ethers.BrowserProvider(instance);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, DepositContractABI as ethers.InterfaceAbi, signer);

    setProvider(provider);
    setSigner(signer);
    setContract(contract);
    const accounts = await signer.getAddress();
    setAccount(accounts);
  };

  const fetchBalance = async () => {
    if (contract && account) {
      const balance = await contract.balances(account);
      setBalance(ethers.formatEther(balance));
    }
  };

  const depositFunds = async () => {
    if (contract && depositAmount) {
      const tx = await contract.deposit({
        value: ethers.parseEther(depositAmount),
      });
      await tx.wait();
      fetchBalance();
      setDepositAmount("");
    }
  };

  useEffect(() => {
    if (account) fetchBalance();
  }, [account, contract]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Polygon Deposit App</h1>
      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>
          <p>Connected Account: {account}</p>
          <p>Your Balance: {balance} MATIC</p>
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Amount in MATIC"
          />
          <button onClick={depositFunds}>Deposit</button>
        </div>
      )}
    </div>
  );
};

export default App;