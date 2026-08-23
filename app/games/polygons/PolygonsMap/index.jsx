import React from "react"
import _ from "lodash"
import { cn, EMPTY_OBJECT } from "app/core"
import {
  buildPolygons,
  LIT_LOSE_FILL,
  NUCLEUS_ID,
  ownerFill,
  seedFromAddress
} from "../polygons"
import { ethers } from "ethers"
import PolygonCellGroup from "./PolygonCellGroup"
import { finishSpin, revealCell, spinOf } from "../PolygonsGame/actions"

const TRAIL = 4
const SPIN_MS = 42
const SWEEP_MS = 18
const WIND_MS = 200
const HOLD_FILL_MS = 1000
const FAN_EASE = 12
const LOCK_MS = 280


const PolygonsMap = ({
  address,
  owners = {},
  mates = {},
  polygonCount,
  loseCount = 0,
  account,
  focusId,
  flashIds = {},
  litIds = {},
  manyLit,
  splitIds = {},
  spinning,
  celebrate,
  housePop
}) => {
  const svgRef = React.useRef(null)
  const winCount = polygonCount || 0
  const count = winCount + (loseCount || 0)
  const polygons = React.useMemo(() => {
    if (!address || !count) return EMPTY_OBJECT
    return buildPolygons(seedFromAddress(address), count, winCount)
  }, [address, count, winCount])
  const wheel = React.useMemo(() => {
    return _.map(_.sortBy(Object.values(polygons), (cell) => Math.atan2(cell.y - 0.5, cell.x - 0.5)), "id")
  }, [polygons])
  const mineAddr = React.useMemo(() => {
    if (!account) return
    return ethers.getAddress(account)
  }, [account])

  React.useEffect(() => {
    if (!spinning) return
    const svg = svgRef.current
    if (!svg) return
    if (!wheel.length) return
    const spin = spinOf(address)
    const nodes = collectNodes(svg)
    let chase = []
    const held = []
    const paint = (ids, sweep) => {
      restoreChase(nodes, chase, held)
      if (!ids || !ids.length) {
        chase = []
        lightHeld(nodes, held)
        return
      }
      if (sweep) {
        chase = _.uniq(_.filter([ids[0], ...chase], (id) => _.isFinite(id)))
        if (_.isFinite(sweep)) chase = _.take(chase, Math.max(TRAIL, sweep))
      } else {
        chase = _.take(_.filter([ids[0], ...chase], (id) => _.isFinite(id)), TRAIL)
      }
      lightChase(nodes, chase, Boolean(sweep))
      lightHeld(nodes, held, mineAddr)
    }
    const holdStart = Date.now()
    const stop = runWheel({
      wheel,
      getWinners: () => spin.landing,
      delay: () => {
        if (!spin.holding) return SPIN_MS
        const t = _.clamp((Date.now() - holdStart) / HOLD_FILL_MS, 0, 1)
        return WIND_MS + t * t * (SPIN_MS - WIND_MS)
      },
      onTick: paint,
      onHold: (id) => {
        if (!_.isFinite(id)) return
        if (_.includes(held, id)) return
        held.push(id)
        lightHeld(nodes, [id], mineAddr)
        const draw = _.find(Object.values(spin.ticket && spin.ticket.draws || {}), (row) => {
          return row.assigned && row.polygonId === id
        })
        revealCell(address, id, draw)
      },
      onDone: (ids) => finishSpin(address, ids)
    })
    return () => stop()
  }, [spinning, wheel, address])

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
      {_.map(polygons, (polygon) => {
        const lit = litIds[polygon.id]
        let trailRank = -1
        if (lit) trailRank = lit.rank
        if (manyLit) trailRank = 0
        let isLit = trailRank === 0
        if (manyLit) isLit = Boolean(lit)
        const isFlash = Boolean(flashIds[polygon.id])
        const { address: owner } = owners[polygon.id] || {}
        const { address: mate } = mates[polygon.id] || {}
        if (spinning) {
          isLit = false
        }
        return (
          <PolygonCellGroup
            key={polygon.id}
            polygon={polygon}
            owner={owner}
            mate={mate}
            winCount={winCount}
            mineAddr={mineAddr}
            isFocus={focusId === polygon.id}
            isFlash={isFlash}
            isLit={isLit}
            trailRank={trailRank}
            isSplitFlash={Boolean(splitIds[polygon.id])}
            spinning={spinning}
            manyLit={manyLit}
            celebrate={celebrate}
            housePop={housePop}
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
      && prev.mates === next.mates
      && prev.flashIds === next.flashIds
      && prev.account === next.account
  }
  return prev.address === next.address
    && prev.owners === next.owners
    && prev.mates === next.mates
    && prev.polygonCount === next.polygonCount
    && prev.loseCount === next.loseCount
    && prev.account === next.account
    && prev.focusId === next.focusId
    && prev.flashIds === next.flashIds
    && prev.litIds === next.litIds
    && prev.manyLit === next.manyLit
    && prev.splitIds === next.splitIds
    && prev.spinning === next.spinning
    && prev.celebrate === next.celebrate
    && prev.housePop === next.housePop
}


export default React.memo(PolygonsMap, mapEqual)


const GLOW_RANKS = [
  "polygons-map-cell-glow-on",
  "polygons-map-cell-glow-1",
  "polygons-map-cell-glow-2",
  "polygons-map-cell-glow-3",
  "polygons-map-cell-glow-3",
  "polygons-map-cell-glow-3"
]
const CHASE_WIN = [
  "color-mix(in srgb, var(--cs-accent) 52%, var(--cs-bg))",
  "color-mix(in srgb, var(--cs-accent) 32%, var(--cs-bg))",
  "color-mix(in srgb, var(--cs-accent) 20%, var(--cs-bg))",
  "color-mix(in srgb, var(--cs-accent) 12%, var(--cs-bg))",
  "color-mix(in srgb, var(--cs-accent) 8%, var(--cs-bg))",
  "color-mix(in srgb, var(--cs-accent) 5%, var(--cs-bg))"
]
const CHASE_LOSE = [
  "color-mix(in srgb, var(--cs-accent-2) 52%, var(--cs-bg))",
  "color-mix(in srgb, var(--cs-accent-2) 32%, var(--cs-bg))",
  "color-mix(in srgb, var(--cs-accent-2) 20%, var(--cs-bg))",
  "color-mix(in srgb, var(--cs-accent-2) 12%, var(--cs-bg))",
  "color-mix(in srgb, var(--cs-accent-2) 8%, var(--cs-bg))",
  "color-mix(in srgb, var(--cs-accent-2) 5%, var(--cs-bg))"
]


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


const restoreChase = (nodes, ids, held) => {
  _.forEach(_.uniq(ids), (id) => {
    if (_.includes(held, id)) return
    const row = nodes[id]
    if (!row) return
    _.forEach(row.cells, (el, i) => {
      el.setAttribute("fill", row.idle[i])
      el.classList.remove("polygons-map-cell-lit")
    })
    _.forEach(row.glows, (el) => {
      el.classList.remove(...GLOW_RANKS)
    })
  })
}


const lightChase = (nodes, ids, many) => {
  _.forEach(ids, (id, i) => {
    const row = nodes[id]
    if (!row) return
    let rank = i
    if (many) rank = 0
    let fills = CHASE_WIN
    if (row.lose) fills = CHASE_LOSE
    const fill = fills[rank] || fills[0]
    _.forEach(row.cells, (el) => {
      if (rank === 0) el.classList.add("polygons-map-cell-lit")
      if (row.occupied) return
      el.setAttribute("fill", fill)
    })
    const glowClass = GLOW_RANKS[rank]
    _.forEach(row.glows, (el) => {
      if (glowClass) el.classList.add(glowClass)
    })
  })
}


const lightHeld = (nodes, ids, player) => {
  _.forEach(_.uniq(ids), (id) => {
    const row = nodes[id]
    if (!row) return
    const isNucleus = id === NUCLEUS_ID
    let fill = "var(--cs-accent)"
    if (player) fill = ownerFill(player, true, isNucleus)
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


const runWheel = ({ wheel, getWinners, delay, onTick, onHold, onDone }) => {
  const span = wheel.length
  let index = 0
  let remaining
  let fanStep = 0
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
    onTick([])
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
    if (!remaining || !remaining[id]) return
    held.push(id)
    delete remaining[id]
    if (onHold) onHold(id)
  }

  const loadHits = () => {
    if (remaining) return
    const winners = getWinners()
    if (!_.isArray(winners)) return
    remaining = {}
    _.forEach(winners, (raw) => {
      const id = Number(raw)
      if (!_.isFinite(id)) return
      if (_.indexOf(wheel, id) < 0) return
      remaining[id] = { id }
    })
  }

  const paintHead = (sweep) => {
    onTick([wheel[index]], sweep)
  }

  const fanTick = () => {
    if (stopped || finished) return
    stamp(wheel[index])
    const t = _.clamp(fanStep / FAN_EASE, 0, 1)
    paintHead(Math.min(span, TRAIL + fanStep))
    fanStep += 1
    if (fanStep >= span) {
      _.forEach(_.map(remaining, "id"), stamp)
      schedule(LOCK_MS, finish)
      return
    }
    const wait = SPIN_MS + t * t * (SWEEP_MS - SPIN_MS)
    schedule(wait, () => {
      if (stopped || finished) return
      index = (index + 1) % span
      fanTick()
    })
  }

  const tick = () => {
    if (stopped || finished) return
    loadHits()
    if (finished || stopped) return
    if (remaining) {
      fanTick()
      return
    }
    index = (index + 1) % span
    paintHead(false)
    schedule(delay(), tick)
  }

  paintHead(false)
  schedule(delay(), tick)

  return () => {
    stopped = true
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }
}
