import React from "react"
import "./index.scss"
import _ from "lodash"
import { select } from "d3-selection"
import { easeCubicOut } from "d3-ease"
import { path } from "d3-path"
import "d3-transition"
import { CHIP_COLORS, toChips } from "../../chips"

const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 19, 20, 22, 24, 26, 28, 29, 31, 33, 35]
const CELL_W = 84
const CELL_H = 56
const ZERO_H = 64
const WIDTH = CELL_W * 3
const HEIGHT = ZERO_H + CELL_H * 12

const COLORS = {
  red: "var(--mantine-color-red-6)",
  black: "var(--mantine-color-gray-7)",
  green: "var(--mantine-color-teal-6)",
  stroke: "var(--mantine-color-gray-2)",
  winner: "var(--mantine-color-indigo-6)",
  text: "var(--mantine-color-white)"
}


const RouletteTable = React.memo(({ bets, winningNumber, landingNumber, spinning, onNumberClick, onReveal }) => {
  const svgRef = React.useRef(null)
  const clickRef = React.useRef(onNumberClick)
  const landingRef = React.useRef(landingNumber)
  const onRevealRef = React.useRef(onReveal)
  const litRef = React.useRef(winningNumber)
  const [litNumber, setLitNumber] = React.useState(winningNumber)
  clickRef.current = onNumberClick
  landingRef.current = landingNumber
  onRevealRef.current = onReveal
  litRef.current = litNumber

  const spots = React.useMemo(() => _.range(37).map((number) => ({
    number,
    bet: bets[number] || 0,
    winner: !spinning && litNumber === number,
    flash: spinning && litNumber === number,
    ...spotLayout(number)
  })), [bets, litNumber, spinning])

  React.useEffect(() => {
    drawTable(svgRef.current, spots, clickRef)
  }, [spots])

  React.useEffect(() => {
    if (!spinning) return
    return runNumberFlash({
      from: litRef.current,
      getWinner: () => landingRef.current,
      onTick: setLitNumber,
      onDone: (winner) => {
        setLitNumber(winner)
        burstSparkles(svgRef.current, { number: winner, ...spotLayout(winner) })
        if (onRevealRef.current) onRevealRef.current()
      }
    })
  }, [spinning])

  React.useEffect(() => {
    if (spinning) return
    if (winningNumber == null) return
    setLitNumber(winningNumber)
  }, [spinning, winningNumber])

  return (
    <svg
      ref={svgRef}
      className="RouletteTable_svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMin meet"
      role="img"
      aria-label="Roulette table"
    />
  )
})

export default RouletteTable


const spotLayout = (number) => {
  if (number === 0) {
    return { x: 0, y: 0, w: CELL_W * 3, h: ZERO_H, color: COLORS.green }
  }
  const col = 2 - ((number - 1) % 3)
  const row = Math.floor((number - 1) / 3)
  let color = COLORS.red
  if (BLACK_NUMBERS.includes(number)) color = COLORS.black
  return {
    x: col * CELL_W,
    y: ZERO_H + row * CELL_H,
    w: CELL_W,
    h: CELL_H,
    color
  }
}

const roundedRect = (x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2)
  const p = path()
  p.moveTo(x + radius, y)
  p.lineTo(x + w - radius, y)
  p.quadraticCurveTo(x + w, y, x + w, y + radius)
  p.lineTo(x + w, y + h - radius)
  p.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  p.lineTo(x + radius, y + h)
  p.quadraticCurveTo(x, y + h, x, y + h - radius)
  p.lineTo(x, y + radius)
  p.quadraticCurveTo(x, y, x + radius, y)
  p.closePath()
  return p.toString()
}


const ensureScene = (svg) => {
  if (!svg.select("defs.table-defs").empty()) return

  const defs = svg.append("defs").attr("class", "table-defs")

  const lift = defs.append("filter").attr("id", "spotLift").attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%")
  lift.append("feDropShadow")
    .attr("dx", "0")
    .attr("dy", "1")
    .attr("stdDeviation", "1")
    .attr("flood-color", "var(--mantine-color-gray-9)")
    .attr("flood-opacity", "0.08")

  const winner = defs.append("filter").attr("id", "winnerLift").attr("x", "-25%").attr("y", "-25%").attr("width", "150%").attr("height", "150%")
  winner.append("feDropShadow")
    .attr("dx", "0")
    .attr("dy", "1")
    .attr("stdDeviation", "1.5")
    .attr("flood-color", "var(--mantine-color-indigo-6)")
    .attr("flood-opacity", "0.22")

  const chip = defs.append("filter").attr("id", "chipShadow").attr("x", "-40%").attr("y", "-40%").attr("width", "180%").attr("height", "180%")
  chip.append("feDropShadow")
    .attr("dx", "0")
    .attr("dy", "1")
    .attr("stdDeviation", "1")
    .attr("flood-color", "var(--mantine-color-gray-9)")
    .attr("flood-opacity", "0.12")

  svg.append("g").attr("class", "spots")
  svg.append("g").attr("class", "fx")
}

const drawTable = (node, spots, clickRef) => {
  if (!node) return
  const svg = select(node)
  ensureScene(svg)

  const cells = svg.select("g.spots").selectAll("g.spot").data(spots, (d) => d.number)

  const enter = cells.enter().append("g")
    .attr("class", "spot")
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      event.preventDefault()
      clickRef.current(d.number)
    })
    .on("mouseenter", function(event, d) {
      const lit = d.winner || d.flash
      select(this).select(".spot-body")
        .attr("filter", lit ? "url(#winnerLift)" : "url(#spotLift)")
        .attr("stroke", COLORS.winner)
    })
    .on("mouseleave", function(event, d) {
      const lit = d.winner || d.flash
      select(this).select(".spot-body")
        .attr("filter", lit ? "url(#winnerLift)" : null)
        .attr("stroke", lit ? COLORS.winner : COLORS.stroke)
    })

  enter.append("path").attr("class", "spot-body")
  enter.append("text")
    .attr("class", "spot-label")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .style("pointer-events", "none")
    .style("font-family", "Roboto, Helvetica, Arial, sans-serif")
    .style("font-weight", "500")
    .text((d) => d.number)

  const all = enter.merge(cells)
  all.attr("class", (d) => {
    let className = "spot"
    if (d.flash) className = "spot spot-flash"
    if (d.winner) className = "spot spot-winner"
    return className
  })
  all.select(".spot-body")
    .attr("d", (d) => roundedRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4, 8))
    .attr("fill", (d) => {
      if (d.flash) return COLORS.winner
      return d.color
    })
    .attr("stroke", (d) => {
      if (d.winner || d.flash) return COLORS.winner
      return COLORS.stroke
    })
    .attr("stroke-width", (d) => {
      if (d.winner || d.flash) return 2.5
      return 1
    })
    .attr("filter", (d) => {
      if (d.winner || d.flash) return "url(#winnerLift)"
      return null
    })

  all.select(".spot-label")
    .attr("x", (d) => d.x + d.w / 2)
    .attr("y", (d) => d.y + d.h / 2 + 1)
    .attr("fill", COLORS.text)
    .attr("font-size", (d) => d.number === 0 ? 18 : 15)

  const chips = all.selectAll("g.chip").data((d) => chipStack(d), (d) => `${d.number}-${d.index}-${d.value}`)
  const chipEnter = chips.enter().append("g").attr("class", "chip").attr("filter", "url(#chipShadow)")
  chipEnter.append("circle").attr("class", "chip-disc")
  chipEnter.append("circle")
    .attr("class", "chip-ring")
    .attr("fill", "none")
  chipEnter.append("text")
    .attr("class", "chip-value")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .style("font-weight", "500")
    .style("font-family", "Roboto, Helvetica, Arial, sans-serif")
    .style("pointer-events", "none")

  chipEnter
    .attr("transform", (d) => chipTransform(d, 8))
    .attr("opacity", 0)
    .transition()
    .duration(160)
    .ease(easeCubicOut)
    .attr("opacity", 1)
    .attr("transform", (d) => chipTransform(d, 0))

  const chipAll = chipEnter.merge(chips)
  chips.attr("transform", (d) => chipTransform(d, 0))
  chipAll.select(".chip-disc")
    .attr("r", 16)
    .attr("fill", (d) => CHIP_COLORS[d.value].fill)
  chipAll.select(".chip-ring")
    .attr("r", 12.5)
    .attr("stroke-width", 1.6)
    .attr("stroke", (d) => CHIP_COLORS[d.value].stroke)
  chipAll.select(".chip-value")
    .attr("font-size", 12)
    .attr("fill", (d) => CHIP_COLORS[d.value].text)
    .text((d) => d.value)
  chips.exit().remove()
}

const chipStack = (spot) => {
  const values = toChips(spot.bet).slice(-4)
  return values.map((value, index) => ({
    number: spot.number,
    value,
    index,
    x: spot.x,
    y: spot.y,
    w: spot.w,
    h: spot.h
  }))
}

const chipTransform = (d, extraY) => {
  const offset = (d.index - 1.5) * 4
  return `translate(${d.x + d.w / 2 + offset}, ${d.y + d.h / 2 - d.index * 3 - extraY})`
}

const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
const SPIN_MS = 45
const SLOW_STEPS = 12

const runNumberFlash = ({ from, getWinner, onTick, onDone }) => {
  let timer
  let stopped = false
  let steps = 0
  let startIndex = _.indexOf(WHEEL, from)
  if (startIndex < 0) startIndex = 0
  let index = startIndex

  onTick(WHEEL[index])

  const tick = () => {
    if (stopped) return
    index = (index + 1) % WHEEL.length
    steps += 1
    onTick(WHEEL[index])

    const winner = getWinner()
    if (winner == null) {
      timer = _.delay(tick, SPIN_MS)
      return
    }

    const winnerIndex = _.indexOf(WHEEL, winner)
    const distance = (winnerIndex - startIndex + WHEEL.length) % WHEEL.length
    const minSteps = WHEEL.length * 3 + distance
    if (steps >= minSteps && index === winnerIndex) {
      onDone(winner)
      return
    }

    let remaining = minSteps - steps
    if (steps >= minSteps) remaining = (winnerIndex - index + WHEEL.length) % WHEEL.length
    let delay = SPIN_MS
    if (remaining <= SLOW_STEPS) {
      const t = 1 - remaining / SLOW_STEPS
      delay = SPIN_MS + t * t * 280
    }
    timer = _.delay(tick, delay)
  }

  timer = _.delay(tick, SPIN_MS)

  return () => {
    stopped = true
    clearTimeout(timer)
  }
}

const burstSparkles = (node, spot) => {
  if (!node || !spot) return
  const fx = select(node).select("g.fx")
  const sparks = _.range(6).map((i) => ({
    i,
    x: spot.x + spot.w / 2,
    y: spot.y + spot.h / 2
  }))
  fx.selectAll("circle.spark").data(sparks, (d) => d.i).enter().append("circle")
    .attr("class", "spark")
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", 1.8)
    .attr("fill", COLORS.winner)
    .attr("opacity", 0.55)
    .transition()
    .duration(360)
    .ease(easeCubicOut)
    .attr("cx", (d) => d.x + Math.cos((d.i / 6) * Math.PI * 2) * 16)
    .attr("cy", (d) => d.y + Math.sin((d.i / 6) * Math.PI * 2) * 12)
    .attr("r", 0)
    .attr("opacity", 0)
    .remove()
}
