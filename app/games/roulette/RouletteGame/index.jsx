import React from "react"
import "./index.scss"
import _ from "lodash"
import BettingSpot from "./BettingSpot"
import BettingChip from "./BettingChip"


const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 19, 20, 22, 24, 26, 28, 29, 31, 33, 35]

const RouletteGame = React.memo(() => {
  const [bets, setBets] = React.useState(_.range(37).fill(0))
  console.log(bets)
  return (
    <div className="RouletteGame_root">
      <svg className="RouletteGame_table" viewBox="0 0 140 50">
        <BettingSpot
          topLeftRadius={2}
          bottomLeftRadius={2}
          x={0}
          y={0}
          width={1}
          height={3}
          color="green"
          label={0}
        />
        {_.range(36).map((index) => {
          const number = index + 1
          const y = (index % 3)
          const x = Math.floor(index / 3) + 1
          const color = BLACK_NUMBERS.includes(number) ? "black" : "red"
          const props = {}
          if (number === 36) props.bottomRightRadius = 2
          if (number === 34) props.topRightRadius = 2

          return (
            <g key={number}>
              <BettingSpot
                {...props}
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
              />
              {bets[number] > 0 && 
                <BettingChip
                  x={x}
                  y={y}
                  color={color}
                  label={number}
                  value={bets[number]}
                  onClick={() => {
                    const newBet = [...bets]
                    newBet[number] += 1
                    setBets(newBet)
                  }}
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