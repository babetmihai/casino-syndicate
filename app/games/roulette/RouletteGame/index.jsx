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

const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 19, 20, 22, 24, 26, 28, 29, 31, 33, 35]


const RouletteGame = React.memo(({ contract, address }) => {
  const { t } = useTranslation()
  const [bets, setBets] = React.useState(_.range(37).fill(0))

  const totalBet = _.sum(bets)

  const { playerBalance } = useSelector(() => selectRoulette(address))
  React.useEffect(() => {
    fetchRoulette(address)
  }, [address])

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
      </div>
      <Text c="dimmed">
        playerBalance: {playerBalance}
      </Text>
      <Text c="dimmed">
        totalBet: {totalBet}
      </Text>
      <svg className="RouletteGame_table" viewBox="0 0 150 50">
        {_.range(37).map((number) => {
          const y = ((number - 1) % 3)
          const x = Math.floor((number - 1) / 3) + 2
          const color = BLACK_NUMBERS.includes(number) ? "black" : "red"

          const chipProps = {}
          const spotProps = {}
          if (number === 36) spotProps.bottomRightRadius = 2
          if (number === 34) spotProps.topRightRadius = 2
          if (number === 0) {
            spotProps.x = 1
            spotProps.y = 0
            spotProps.width = 1
            spotProps.height = 3
            spotProps.color = "green"
            spotProps.bottomLeftRadius = 2
            spotProps.topLeftRadius = 2

            chipProps.y = 1
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
    </div>
  )
})


export default RouletteGame