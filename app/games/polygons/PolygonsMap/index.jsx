import React from "react"
import _ from "lodash"
import { cn, EMPTY_OBJECT } from "app/core"
import {
  buildPolygons,
  cellBorder,
  LIT_LOSE_FILL,
  ownerFill,
  seedFromAddress
} from "../polygons"
import { ethers } from "ethers"
import PolygonCellGroup from "./PolygonCellGroup"
import { finishSpin, revealCell, spinOf } from "../PolygonsGame/actions"

const PULSE_MS = 70
const LOCK_MS = 280


const PolygonsMap = ({
  address,
  owners = {},
  polygonCount,
  loseCount = 0,
  account,
  focusId,
  flashIds = {},
  litIds = {},
  manyLit,
  spinning,
  celebrate,
  housePop
}) => {
  const svgRef = React.useRef(null)
  const winCount = polygonCount || 0
  const count = winCount + (loseCount || 0)
  const strokeWidth = cellBorder(count)
  const polygons = React.useMemo(() => {
    if (!address || !count) return EMPTY_OBJECT
    return buildPolygons(seedFromAddress(address), count, winCount)
  }, [address, count, winCount])
  const mineAddr = React.useMemo(() => {
    if (!account) return
    return ethers.getAddress(account)
  }, [account])

  React.useEffect(() => {
    if (!spinning) return
    const svg = svgRef.current
    if (!svg) return
    const spin = spinOf(address)
    const nodes = collectNodes(svg)
    const held = []
    const stop = runPulse({
      getWinners: () => spin.landing,
      onHold: (id) => {
        if (!_.isFinite(id)) return
        if (_.includes(held, id)) return
        held.push(id)
        lightHeld(nodes, [id], mineAddr)
        revealCell(address, id)
      },
      onDone: (ids) => finishSpin(address, ids)
    })
    return () => stop()
  }, [spinning, address])

  return (
    <svg
      ref={svgRef}
      className={cn(
        "polygons-map",
        spinning && "polygons-map-spinning",
        "block aspect-square h-auto overflow-hidden"
      )}
      viewBox="0 0 1 1"
      preserveAspectRatio="xMidYMid meet"
    >
      {_.map(_.sortBy(Object.values(polygons), (polygon) => polygon.id < winCount), (polygon) => {
        const lit = litIds[polygon.id]
        let trailRank = -1
        if (lit) trailRank = lit.rank
        if (manyLit) trailRank = 0
        let isLit = trailRank === 0
        if (manyLit) isLit = Boolean(lit)
        const isFlash = Boolean(flashIds[polygon.id])
        const { address: owner } = owners[polygon.id] || {}
        if (spinning) {
          isLit = false
        }
        return (
          <PolygonCellGroup
            key={polygon.id}
            polygon={polygon}
            owner={owner}
            winCount={winCount}
            mineAddr={mineAddr}
            isFocus={focusId === polygon.id}
            isFlash={isFlash}
            isLit={isLit}
            trailRank={trailRank}
            spinning={spinning}
            manyLit={manyLit}
            celebrate={celebrate}
            housePop={housePop}
            strokeWidth={strokeWidth}
          />
        )
      })}
    </svg>
  )
}


const mapEqual = (prev, next) => {
  if (prev.spinning && next.spinning) {
    return prev.address === next.address
      && prev.polygonCount === next.polygonCount
      && prev.loseCount === next.loseCount
      && prev.owners === next.owners
      && prev.flashIds === next.flashIds
      && prev.account === next.account
  }
  return prev.address === next.address
    && prev.owners === next.owners
    && prev.polygonCount === next.polygonCount
    && prev.loseCount === next.loseCount
    && prev.account === next.account
    && prev.focusId === next.focusId
    && prev.flashIds === next.flashIds
    && prev.litIds === next.litIds
    && prev.manyLit === next.manyLit
    && prev.spinning === next.spinning
    && prev.celebrate === next.celebrate
    && prev.housePop === next.housePop
}


export default React.memo(PolygonsMap, mapEqual)


const collectNodes = (svg) => {
  const nodes = {}
  _.forEach(svg.querySelectorAll("[data-cell]"), (el) => {
    const id = Number(el.getAttribute("data-cell"))
    let row = nodes[id]
    if (!row) {
      row = { cells: [], idle: [], lose: false, occupied: false, glows: [] }
      nodes[id] = row
    }
    row.cells.push(el)
    row.idle.push(el.getAttribute("data-idle-fill"))
    if (el.getAttribute("data-lose")) row.lose = true
    if (el.getAttribute("data-occupied")) row.occupied = true
  })
  _.forEach(svg.querySelectorAll("[data-cell-glow]"), (el) => {
    const id = Number(el.getAttribute("data-cell-glow"))
    const row = nodes[id]
    if (!row) return
    row.glows.push(el)
  })
  return nodes
}


const lightHeld = (nodes, ids, player) => {
  _.forEach(_.uniq(ids), (id) => {
    const row = nodes[id]
    if (!row) return
    let fill = "var(--cs-accent)"
    if (player) fill = ownerFill(player, true)
    if (row.lose) fill = LIT_LOSE_FILL
    _.forEach(row.cells, (el) => {
      el.setAttribute("fill", fill)
      el.classList.add("polygons-map-cell-lit", "polygons-map-cell-taken")
    })
    _.forEach(row.glows, (el) => {
      el.classList.add("polygons-map-cell-glow-on", "polygons-map-cell-glow-flash")
    })
  })
}


const runPulse = ({ getWinners, onHold, onDone }) => {
  let raf = 0
  let stopped = false
  let finished = false
  const held = []

  const finish = () => {
    if (finished || stopped) return
    finished = true
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    onDone(held)
  }

  const schedule = (ms, next) => {
    const due = performance.now() + ms
    const wait = (now) => {
      if (stopped || finished) return
      if (now < due) {
        raf = requestAnimationFrame(wait)
        return
      }
      next()
    }
    raf = requestAnimationFrame(wait)
  }

  const stamp = (id) => {
    if (!_.isFinite(id)) return
    if (_.includes(held, id)) return
    held.push(id)
    if (onHold) onHold(id)
  }

  const tick = () => {
    if (stopped || finished) return
    const winners = getWinners()
    if (!_.isArray(winners)) {
      schedule(PULSE_MS, tick)
      return
    }
    _.forEach(winners, (raw) => stamp(Number(raw)))
    schedule(LOCK_MS, finish)
  }

  schedule(PULSE_MS, tick)

  return () => {
    stopped = true
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }
}
