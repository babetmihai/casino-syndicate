import React from "react"
import "./index.scss"
import _ from "lodash"


const SIZE = 3

const RouletteGame = React.memo(() => {
  return (
    <div className="RouletteGame_root">
      <svg className="RouletteGame_table" viewBox="0 0 100 100">
        {_.range(12).map((row) => {
          return (
            <g key={row}>
              {_.range(3).map((column) => {
                const number = (row * 3) + (3 - column)
                const x = row * SIZE
                const y = column * SIZE
                const color = number % 2 === 0 ? "red" : "transparent"
                return (
                  <g key={column}>
                    <rect
                      x={x}
                      y={y}
                      width={SIZE}
                      height={SIZE}
                      strokeWidth={0.1}
                      stroke="black"
                      fill={color}
                    />
                    <text
                      x={x + (SIZE / 2)}
                      y={y + (SIZE / 2)}
                      textAnchor="middle"
                      fill="white"
                      dominantBaseline="middle"
                      fontSize={SIZE * 0.4}
                    >
                      {number}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}

      </svg>
    </div>
  )
})
export default RouletteGame