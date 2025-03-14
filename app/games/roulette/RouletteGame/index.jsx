import React from "react"
import "./index.scss"
import _ from "lodash"
import RouletteBet from "./RouletteBet"

const RouletteGame = React.memo(() => {
  return (
    <div className="RouletteGame_root">
      <svg className="RouletteGame_table" viewBox="0 0 140 50">
        <RouletteBet
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
                const color = number % 2 === 0 ? "red" : "transparent"
                return (
                  <RouletteBet
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
          return (
            <RouletteBet
              key={row}
              x={13}
              y={row}
              color="green"
              label={labels[2 - row]}
            />
          )
        })}
        {_.range(3).map((row) => {
          const labels = ["1st 12", "2nd 12", "3rd 12"]
          return (
            <RouletteBet
              key={row}
              x={(1 + 4 * row)}
              y={3}
              width={4}
              color="green"
              label={labels[row]}
            />
          )
        })}
        <RouletteBet
          x={1}
          y={4}
          width={2}
          color="green"
          label={"1 to 18"}
        />
        <RouletteBet
          x={11}
          y={4}
          width={2}
          color="green"
          label={"19 to 36"}
        />
        <RouletteBet
          x={3}
          y={4}
          width={2}
          color="green"
          label={"EVEN"}
        />
        <RouletteBet
          x={9}
          y={4}
          width={2}
          color="green"
          label={"ODD"}
        />
        <RouletteBet
          x={5}
          y={4}
          width={2}
          color="red"
        />
        <RouletteBet
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