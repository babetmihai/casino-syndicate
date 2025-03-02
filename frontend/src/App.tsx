import React, { useState, useEffect } from "react";
import Web3Modal from "web3modal";
import { ethers } from "ethers";
import DepositContractJSON from "../../artifacts/contracts/DepositContracts.sol/DepositContract.json";


const { abi: DepositContractABI } = DepositContractJSON;
const { VITE_CONTRACT_ADDRESS, VITE_LOCAL_RPC_URL } = import.meta.env



const App: React.FC = () => {
  // const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  // const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [depositAmount, setDepositAmount] = useState<string>("");


  const init = async () => {
    if (contract && account) {
      try {
        const { balance } = await contract.getContractBalances();
        console.log("Balance:", balance);
        setBalance(ethers.formatEther(balance));
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      }
    }
  };
 
  useEffect(() => {
    if (account && contract) {
      init();
    }
  }, [account, contract]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Deposit App (Hardhat Local)</h1>
      {!account ? (
        <button 
          onClick={async () => {
            try {
              const web3Modal = new Web3Modal({
                network: VITE_LOCAL_RPC_URL,
                cacheProvider: true,
                providerOptions: {},
              });
              const instance = await web3Modal.connect();
              const provider = new ethers.BrowserProvider(instance);
              const signer = await provider.getSigner();
              const contract = new ethers.Contract(VITE_CONTRACT_ADDRESS, DepositContractABI, signer);
              const code = await provider.getCode(VITE_CONTRACT_ADDRESS);
              console.log("Code:", code);
        
              // setProvider(provider);
              // setSigner(signer);
              setContract(contract);
              const address = await signer.getAddress();
              setAccount(address);
            } catch (error) {
              console.error("Failed to connect wallet:", error);
            }
          }}
        >
          Connect Wallet
        </button>
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
          <button 
            onClick={async () => {
              if (contract && depositAmount) {
                try {
                  const tx = await contract.deposit({
                    value: ethers.parseEther(depositAmount),
                  });
                  await tx.wait();
                  init();
                  setDepositAmount("");
                } catch (error) {
                  console.error("Failed to deposit:", error);
                }
              }
            }}
          >
            Deposit
          </button>
        </div>
      )}
    </div>
  );
};

export default App;