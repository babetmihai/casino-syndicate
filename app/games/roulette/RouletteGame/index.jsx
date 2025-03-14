import React from "react"
import "./index.scss"
import _ from "lodash"
import BettingSpot from "./BettingSpot"


const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 19, 20, 22, 24, 26, 28, 29, 31, 33, 35]

const RouletteGame = React.memo(() => {
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
        {_.range(12).map((row) => {
          return (
            <g key={row}>
              {_.range(3).map((column) => {
                const number = (row * 3) + (3 - column)
                const x = (row + 1)
                const y = column
                const color = BLACK_NUMBERS.includes(number) ? "black" : "red"
                return (
                  <BettingSpot
                    key={column}
                    x={x}
                    y={y}
                    color={color}
                    label={number}
                  />
                )
              })}
            </g>
          )
        })}
        {_.range(3).map((row) => {
          const labels = ["1st", "2nd", "3rd"]
          const props = {}
          if (row === 2) props.bottomRightRadius = 2
          if (row === 0) props.topRightRadius = 2

          return (
            <BettingSpot
              key={row}
              x={13}
              y={row}
              color="green"
              label={labels[2 - row]}
              {...props}
            />
          )
        })}
        {_.range(3).map((row) => {
          const labels = ["1st 12", "2nd 12", "3rd 12"]
          return (
            <BettingSpot
              key={row}
              x={(1 + 4 * row)}
              y={3}
              width={4}
              color="green"
              label={labels[row]}
            />
          )
        })}
        <BettingSpot
          x={1}
          y={4}
          width={2}
          color="green"
          label={"1 to 18"}
          bottomLeftRadius={2}
        />
        <BettingSpot
          x={11}
          y={4}
          width={2}
          color="green"
          label={"19 to 36"}
          bottomRightRadius={2}
        />
        <BettingSpot
          x={3}
          y={4}
          width={2}
          color="green"
          label={"EVEN"}
        />
        <BettingSpot
          x={9}
          y={4}
          width={2}
          color="green"
          label={"ODD"}
        />
        <BettingSpot
          x={5}
          y={4}
          width={2}
          color="red"
        />
        <BettingSpot
          x={7}
          y={4}
          width={2}
          color="black"
        />
      </svg>
    </div>
  )
})


export default RouletteGame