import React from "react"
import { initTable, selectContract } from "app/core/tables"
import { ethers } from "ethers"
import { useParams } from "react-router-dom"
import { useSelector } from "react-redux"


const TableProvider = ({ children }) => {
  const { address } = useParams()
  const contract = useSelector(() => selectContract(address))
  React.useEffect(() => {
    if (address) initTable(address)
  }, [address])


  React.useEffect(() => {
    if (contract) {
      // Set up event listener for Deposited events
      contract.on("Deposited", (user, amount, event) => {
        const deposit = {
          user,
          amount: ethers.formatEther(amount), // Convert wei to Ether
          txHash: event.transactionHash
        }

        console.log("Deposit:", deposit)
        console.log(`Deposit from ${user}: ${ethers.formatEther(amount)} ETH`)
      })

      // Cleanup listener on component unmount
      return () => {
        contract.removeAllListeners("Deposited")
      }
    }
  }, [contract?.target])


  return children
}

export default TableProvider
