import React from "react"
import "./index.scss"
import _ from "lodash"
import BettingSpot from "./BettingSpot"
import BettingChip from "./BettingChip"
import { Button, Text } from "@mantine/core"
import { useTranslation } from "react-i18next"
import { fetchRoulette, selectRoulette } from ".."
import { useSelector } from "react-redux"
import { showModal } from "app/core/modals"
import DepositModal from "app/core/tables/DepositModal"
import { ethers } from "ethers"
import client from "app/core/client"
import { getContract, getProvider } from "app/core/contracts"
import { clearLoader, setLoader, useLoader } from "app/core/loaders"
import { Card } from "@mantine/core"
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 19, 20, 22, 24, 26, 28, 29, 31, 33, 35]


const RouletteGame = React.memo(({ address }) => {
  const { t } = useTranslation()
  const [bets, setBets] = React.useState(_.range(37).fill(0))
  const contract = getContract(address)
  const totalBet = _.sum(bets)


  const postingBet = useLoader("postingBet")

  const { playerBalance } = useSelector(() => selectRoulette(address))
  React.useEffect(() => {
    fetchRoulette(address)
  }, [address])

  // todo: use dealer for posting bets
  React.useEffect(() => {
    // Set up event listener for Deposited events
    contract.on("WinningNumber", (number, totalBetAmount, winningAmount, playerBalance, event) => {
      const deposit = {
        number,
        totalBetAmount,
        winningAmount,
        playerBalance,
        txHash: event.transactionHash
      }

      console.log("WinningNumber:", deposit)
      console.log(`WinningNumber: ${number}`)
      console.log(`TotalBetAmount: ${totalBetAmount}`)
      console.log(`WinningAmount: ${winningAmount}`)
      console.log(`PlayerBalance: ${playerBalance}`)
    })

    // Cleanup listener on component unmount
    return () => {
      contract.removeAllListeners("WinningNumber")
    }
  }, [])

  return (
    <div className="RouletteGame_root">
      <div className="RouletteGame_header">
        <Button
          onClick={() => {
            showModal(DepositModal, {
              onSubmit: async ({ balance }) => {
                const tx = await contract.depositBalance({
                  value: ethers.parseEther(balance.toString())
                })
                await tx.wait()
                fetchRoulette(address)
              }
            })
          }}
        >
          {t("deposit")}
        </Button>
        <Button variant="outline" onClick={async () => {
          const tx = await contract.withdrawBalance()
          await tx.wait()
          fetchRoulette(address)
        }}
        >
          {t("withdraw")}
        </Button>
        <Button
          variant="outline"
          loading={postingBet}
          onClick={async () => {
            try {
              setLoader("postingBet")
              const { data } = await client.post(`/tables/${address}/bets`, { bets })
              const { txHash } = data
              const provider = getProvider()
              await provider.waitForTransaction(txHash)
              await fetchRoulette(address)
            } finally {
              clearLoader("postingBet")
            }
          }}
        >
          {t("postBet")}
        </Button>
      </div>
      <Text c="dimmed">
        playerBalance: {playerBalance}
      </Text>
      <Text c="dimmed">
        totalBet: {totalBet}
      </Text>
      <Card className="RouletteGame_table" shadow="lg" radius="lg">
        <svg viewBox="0 0 30 130">
          {_.range(37).map((number) => {
            const x = ((number - 1) % 3)
            const y = Math.floor((number - 1) / 3) + 1
            const color = BLACK_NUMBERS.includes(number) ? "black" : "red"

            const chipProps = {}
            const spotProps = {}
            if (number === 36) spotProps.bottomRightRadius = 2
            if (number === 34) spotProps.bottomLeftRadius = 2
            if (number === 0) {
              spotProps.x = 0
              spotProps.y = 0
              spotProps.width = 3
              spotProps.height = 1
              spotProps.color = "green"
              spotProps.topRightRadius = 2
              spotProps.topLeftRadius = 2

              chipProps.x = 1
            }

            return (
              <g key={number}>
                <BettingSpot
                  x={x}
                  y={y}
                  key={number}
                  color={color}
                  label={number}
                  onClick={() => {
                    const newBet = [...bets]
                    newBet[number] += 1
                    setBets(newBet)
                  }}
                  {...spotProps}
                />
                {bets[number] > 0 &&
                  <BettingChip
                    x={x}
                    y={y}
                    value={bets[number]}
                    onClick={() => {
                      const newBet = [...bets]
                      newBet[number] += 1
                      setBets(newBet)
                    }}
                    {...spotProps}
                    {...chipProps}
                  />
                }
              </g>
            )
          })}
        </svg>
      </Card>
    </div>
  )
})


export default RouletteGame