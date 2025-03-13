import React, { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

const RouletteGame = () => {
  const svgRef = useRef(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [rotation, setRotation] = useState(0)
  const spinTimeoutRef = useRef(null)

  // European roulette wheel numbers in order
  const numbers = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ]

  // Define colors for the numbers (red, black, and green for 0)
  const getColor = (num) => {
    if (num === 0) return "#008000"
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
    return redNumbers.includes(num) ? "#FF0000" : "#000000"
  }

  // Setup the wheel
  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    const width = 400
    const height = 400
    const radius = Math.min(width, height) / 2 - 10

    svg.attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%")

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`)

    // Create a group for the wheel that will rotate
    const wheelGroup = g.append("g")
      .attr("class", "wheel")

    // Create the pie layout
    const pie = d3.pie()
      .sort(null)
      .value(() => 1)

    const arc = d3.arc()
      .innerRadius(radius * 0.3)
      .outerRadius(radius)

    // Draw the sectors
    const arcs = wheelGroup.selectAll(".arc")
      .data(pie(numbers))
      .enter()
      .append("g")
      .attr("class", "arc")

    arcs.append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => getColor(numbers[i]))

    // Add text to each slice
    arcs.append("text")
      .attr("transform", d => {
        const [x, y] = arc.centroid(d)
        const angle = (d.startAngle + d.endAngle) / 2 * 180 / Math.PI - 90
        return `translate(${x}, ${y}) rotate(${angle})`
      })
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .style("font-size", "12px")
      .text((d, i) => numbers[i])

    // Add a small ball
    g.append("circle")
      .attr("class", "ball")
      .attr("r", 6)
      .attr("fill", "white")
      .attr("cx", 0)
      .attr("cy", -radius * 0.8)

    // Add center decoration
    g.append("circle")
      .attr("r", radius * 0.3)
      .attr("fill", "#663300")
      .attr("stroke", "gold")
      .attr("stroke-width", 2)

    // Add the outer rim
    g.append("circle")
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", "gold")
      .attr("stroke-width", 3)

    return () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current)
      }
    }
  }, [])

  // Update wheel rotation
  useEffect(() => {
    if (!svgRef.current) return

    const wheel = d3.select(svgRef.current).select(".wheel")
    wheel.style("transform", `rotate(${rotation}deg)`)

  }, [rotation])

  // Spin the wheel
  const spinWheel = () => {
    if (spinning) return

    setSpinning(true)
    setResult(null)

    // Random number of rotations (3-10) plus a random position
    const spins = 3 + Math.random() * 7
    const finalAngle = spins * 360 + Math.random() * 360
    const duration = 5000 // 5 seconds spin

    let startTime = null

    // Animation function
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = elapsed / duration

      if (progress < 1) {
        // Ease out cubic function for slowing down
        const easing = 1 - Math.pow(1 - progress, 3)
        setRotation(easing * finalAngle)
        requestAnimationFrame(animate)
      } else {
        // Animation complete
        setRotation(finalAngle)

        // Calculate the result
        const degrees = finalAngle % 360
        const sectorAngle = 360 / numbers.length
        const normalizedDegrees = (360 - (degrees % 360)) % 360 // Adjust for counterclockwise
        const index = Math.floor(normalizedDegrees / sectorAngle)
        const winningNumber = numbers[index % numbers.length]

        spinTimeoutRef.current = setTimeout(() => {
          setResult(winningNumber)
          setSpinning(false)
        }, 500)
      }
    }

    requestAnimationFrame(animate)
  }

  return (
    <div className="flex flex-col items-center space-y-4 w-full max-w-md mx-auto">
      <svg ref={svgRef} className="w-full h-auto max-w-md"></svg>

      <div className="text-center space-y-4">
        <button
          onClick={spinWheel}
          disabled={spinning}
          className={`px-6 py-2 rounded-full text-white font-bold ${spinning ? "bg-gray-400" : "bg-red-600 hover:bg-red-700"}`}
        >
          {spinning ? "Spinning..." : "SPIN"}
        </button>

        {result !== null && (
          <div className="text-xl font-bold">
            Result: <span style={{ color: getColor(result) }}>{result}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default RouletteGame