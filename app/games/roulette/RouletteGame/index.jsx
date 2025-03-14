import React from "react"
import "./index.scss"
import _ from "lodash"


const SIZE = 3

const RouletteGame = React.memo(() => {
  return (
    <div className="RouletteGame_root">
      <svg className="RouletteGame_table" viewBox="0 0 100 100">
        <RouletteNumber
          x={0}
          y={0}
          width={SIZE}
          height={SIZE * 3}
          color="green"
          number={0}
        />
        {_.range(12).map((row) => {
          return (
            <g key={row}>

              {_.range(3).map((column) => {
                const number = (row * 3) + (3 - column)
                const x = (row + 1) * SIZE
                const y = column * SIZE
                const color = number % 2 === 0 ? "red" : "transparent"
                return (
                  <RouletteNumber
                    key={column}
                    x={x}
                    y={y}
                    color={color}
                    number={number}
                  />
                )
              })}
            </g>
          )
        })}

      </svg>
    </div>
  )
})


const RouletteNumber = React.memo(({
  x,
  y,
  color,
  number,
  width = SIZE,
  height = SIZE
}) => {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        strokeWidth={0.1}
        stroke="black"
        fill={color}
      />
      <text
        x={x + (width / 2)}
        y={y + (height / 2)}
        textAnchor="middle"
        fill="white"
        dominantBaseline="middle"
        fontSize={Math.min(width, height) * 0.4}
      >
        {number}
      </text>
    </g>
  )
})

export default RouletteGame