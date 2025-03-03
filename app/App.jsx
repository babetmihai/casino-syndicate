import React, { useState, useEffect } from "react";
import Web3Modal from "web3modal";
import { ethers } from "ethers";



const { VITE_CONTRACT_ADDRESS, VITE_LOCAL_RPC_URL, VITE_CONTRACT_NAME } = import.meta.env


const App = () => {
  console.log(VITE_CONTRACT_ADDRESS, VITE_LOCAL_RPC_URL, VITE_CONTRACT_NAME)
  // const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  // const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState("0");
  const [depositAmount, setDepositAmount] = useState("");

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


  const [depositEvents, setDepositEvents] = useState([]);

  useEffect(() => {
    if (contract) {
      // Set up event listener for Deposited events
      contract.on("Deposited", (user, amount, event) => {
        const deposit = {
          user,
          amount: ethers.formatEther(amount), // Convert wei to Ether
          txHash: event.transactionHash,
        };
        setDepositEvents((prev) => [...prev, deposit]);
        console.log(`Deposit from ${user}: ${ethers.formatEther(amount)} ETH`);
      });

      // Cleanup listener on component unmount
      return () => {
        contract.removeAllListeners("Deposited");
      };
    }
  }, [contract]);


  console.log("Deposit Events:", depositEvents);
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
              const abi = await fetch(`/${VITE_CONTRACT_NAME}.json`).then(res => res.json());
              const instance = await web3Modal.connect();
              const provider = new ethers.BrowserProvider(instance);
              const signer = await provider.getSigner();
              const contract = new ethers.Contract(VITE_CONTRACT_ADDRESS, abi, signer);
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