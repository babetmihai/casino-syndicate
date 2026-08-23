import _ from "lodash"

const CX = 0.5
const CY = 0.5
const OUTER_R = 0.48
const LLOYD_STEPS = 12
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const RING_ASPECT = 6.4
const RING_T = 0.028
const RING_GAP = 0.01
const circlePoly = (radius) => {
  return _.times(96, (i) => {
    const t = (i / 96) * Math.PI * 2 - Math.PI / 2
    return [CX + radius * Math.cos(t), CY + radius * Math.sin(t)]
  })
}
const BOUNDS = circlePoly(OUTER_R)


export const seedFromAddress = (address) => {
  return parseInt(String(address).replace("0x", "").slice(0, 8), 16)
}

export const playerHue = (address) => {
  const n = parseInt(String(address).replace("0x", "").slice(10, 16), 16)
  return n % 360
}

export const buildPolygons = (seed, count, winCount) => {
  const rng = mulberry32(seed >>> 0)
  let wins = count
  if (winCount) wins = winCount
  const loses = count - wins
  let innerR = OUTER_R
  if (loses) innerR = houseInnerR(loses)
  const innerBounds = circlePoly(innerR)
  let inner = diskSites(wins, rng, innerR)
  _.times(LLOYD_STEPS, () => {
    inner = _.map(inner, (site, index) => {
      const points = voronoiCell(site, index, inner, innerBounds)
      if (points.length < 3) return site
      const next = polygonCentroid(points)
      const dx = next[0] - CX
      const dy = next[1] - CY
      const dist = Math.hypot(dx, dy)
      const limit = innerR * 0.94
      if (dist <= limit) return next
      return [CX + (dx / dist) * limit, CY + (dy / dist) * limit]
    })
  })
  const innerShapes = _.map(inner, (site, index) => voronoiCell(site, index, inner, innerBounds))
  const rot = rng() * Math.PI * 2
  const outerShapes = ringWedges(loses, rot)
  return _.keyBy(_.map(innerShapes.concat(outerShapes), (points, index) => {
    const center = polygonCentroid(points)
    const r = cellRadius(points, center)
    let round = r * 0.28
    if (index >= wins) round = RING_T * 0.22
    if (round > 0.018) round = 0.018
    if (round < 0.003) round = 0.003
    return {
      id: index,
      x: center[0],
      y: center[1],
      r,
      raw: points,
      points,
      path: roundedPolygonPath(points, round)
    }
  }), "id")
}

export const BORDER_STROKE = "var(--cs-elevated)"
export const BORDER_WIDTH = 0.012

export const cellBorder = (count) => {
  const w = BORDER_WIDTH * Math.sqrt(24 / Math.max(count, 8))
  if (w < 0.0015) return 0.0015
  if (w > BORDER_WIDTH) return BORDER_WIDTH
  return w
}

export const ownerFill = (address, isMine) => {
  if (!address) return "color-mix(in srgb, var(--cs-accent) 10%, var(--cs-bg))"
  if (isMine) return "var(--cs-accent)"
  return `hsl(${playerHue(address)} 48% 46%)`
}

export const ownerStroke = (address, isMine) => {
  if (!address) return "var(--cs-border)"
  if (isMine) return "var(--cs-accent)"
  return "var(--cs-accent-2)"
}

export const LOSE_FILL = "color-mix(in srgb, var(--cs-accent-2) 10%, var(--cs-bg))"
export const LOSE_STROKE = "color-mix(in srgb, var(--cs-accent-2) 28%, transparent)"
export const LIT_WIN_FILL = "var(--cs-accent)"
export const LIT_WIN_STROKE = "var(--cs-accent)"
export const LIT_LOSE_FILL = "var(--cs-accent-2)"
export const LIT_LOSE_STROKE = "var(--cs-accent-2)"
export const SPIN_LOSE_FILL = "var(--cs-accent-2)"
export const SPIN_LOSE_STROKE = "var(--cs-accent-2)"


const mulberry32 = (seed) => {
  let a = seed >>> 0
  return () => {
    a += 0x6D2B79F5
    let t = a
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

const roundedPolygonPath = (points, radius) => {
  if (!points || points.length < 3) return ""
  const n = points.length
  const parts = []
  _.forEach(points, (cur, i) => {
    const prev = points[(i + n - 1) % n]
    const next = points[(i + 1) % n]
    const d1 = Math.hypot(cur[0] - prev[0], cur[1] - prev[1])
    const d2 = Math.hypot(next[0] - cur[0], next[1] - cur[1])
    let r = radius
    if (r > d1 * 0.45) r = d1 * 0.45
    if (r > d2 * 0.45) r = d2 * 0.45
    if (r < 1e-6 || d1 < 1e-6 || d2 < 1e-6) {
      if (i === 0) parts.push(`M${cur[0]},${cur[1]}`)
      else parts.push(`L${cur[0]},${cur[1]}`)
      return
    }
    const start = [
      cur[0] + (prev[0] - cur[0]) / d1 * r,
      cur[1] + (prev[1] - cur[1]) / d1 * r
    ]
    const end = [
      cur[0] + (next[0] - cur[0]) / d2 * r,
      cur[1] + (next[1] - cur[1]) / d2 * r
    ]
    if (i === 0) parts.push(`M${start[0]},${start[1]}`)
    else parts.push(`L${start[0]},${start[1]}`)
    parts.push(`Q${cur[0]},${cur[1]} ${end[0]},${end[1]}`)
  })
  return `${parts.join("")}Z`
}

const cellRadius = (points, center) => {
  let max = 0.04
  _.forEach(points, (point) => {
    const d = Math.hypot(point[0] - center[0], point[1] - center[1])
    if (d > max) max = d
  })
  return max
}

const diskSites = (count, rng, innerR) => {
  if (count <= 1) return _.times(count, () => [CX, CY])
  const rot = rng() * Math.PI * 2
  return _.map(_.range(count), (i) => {
    const r = innerR * Math.sqrt((i + 0.5) / (count + 0.8))
    const theta = i * GOLDEN + rot
    return [CX + r * Math.cos(theta), CY + r * Math.sin(theta)]
  })
}

const houseRows = (count) => {
  if (count <= 0) return 0
  const perRow = Math.floor((Math.PI * 2 * (OUTER_R - RING_T / 2)) / (RING_ASPECT * RING_T))
  let rows = Math.ceil(count / Math.max(perRow, 1))
  if (rows < 1) rows = 1
  return rows
}

const houseInnerR = (count) => {
  const rows = houseRows(count)
  if (!rows) return OUTER_R
  return OUTER_R - rows * RING_T - (rows - 1) * RING_GAP
}

const ringWedges = (count, rot) => {
  if (count <= 0) return []
  const rows = houseRows(count)
  const base = Math.floor(count / rows)
  const extra = count % rows
  const steps = 12
  const shapes = []
  let rOuter = OUTER_R
  _.times(rows, (row) => {
    const n = base + (row < extra ? 1 : 0)
    const rInner = rOuter - RING_T
    const turn = rot + row * 0.41
    _.times(n, (i) => {
      const a0 = turn + (i / n) * Math.PI * 2
      const a1 = turn + ((i + 1) / n) * Math.PI * 2
      const outer = _.map(_.range(steps + 1), (k) => {
        const t = a0 + (a1 - a0) * (k / steps)
        return [CX + rOuter * Math.cos(t), CY + rOuter * Math.sin(t)]
      })
      const inner = _.map(_.range(steps + 1), (k) => {
        const t = a1 + (a0 - a1) * (k / steps)
        return [CX + rInner * Math.cos(t), CY + rInner * Math.sin(t)]
      })
      shapes.push(outer.concat(inner))
    })
    rOuter = rInner - RING_GAP
  })
  return shapes
}

const voronoiCell = (site, index, sites, bounds) => {
  let poly = bounds
  _.forEach(sites, (other, otherIndex) => {
    if (otherIndex === index) return
    const dx = other[0] - site[0]
    const dy = other[1] - site[1]
    if (dx === 0 && dy === 0) return
    const mx = (site[0] + other[0]) / 2
    const my = (site[1] + other[1]) / 2
    poly = clipHalfPlane(poly, dx, dy, mx, my)
  })
  return poly
}

const clipOutsideCircle = (poly, radius) => {
  const r2 = radius * radius
  const dist2 = (point) => {
    const dx = point[0] - CX
    const dy = point[1] - CY
    return dx * dx + dy * dy
  }
  const outside = (point) => dist2(point) >= r2 - 1e-16
  const intersect = (a, b) => {
    const ax = a[0] - CX
    const ay = a[1] - CY
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const A = dx * dx + dy * dy
    const B = 2 * (ax * dx + ay * dy)
    const C = ax * ax + ay * ay - r2
    const disc = B * B - 4 * A * C
    if (A < 1e-16 || disc < 0) return a
    const sqrt = Math.sqrt(disc)
    const t0 = (-B - sqrt) / (2 * A)
    const t1 = (-B + sqrt) / (2 * A)
    let t = t0
    if (t < -1e-9 || t > 1 + 1e-9) t = t1
    t = _.clamp(t, 0, 1)
    return [a[0] + t * dx, a[1] + t * dy]
  }
  const out = []
  _.forEach(poly, (cur, i) => {
    const prev = poly[(i + poly.length - 1) % poly.length]
    const curOut = outside(cur)
    const prevOut = outside(prev)
    if (curOut) {
      if (!prevOut) out.push(intersect(prev, cur))
      out.push(cur)
    } else if (prevOut) {
      out.push(intersect(prev, cur))
    }
  })
  return out
}

const clipHalfPlane = (poly, nx, ny, px, py) => {
  const inside = (point) => (point[0] - px) * nx + (point[1] - py) * ny <= 1e-12
  const intersect = (a, b) => {
    const da = (a[0] - px) * nx + (a[1] - py) * ny
    const db = (b[0] - px) * nx + (b[1] - py) * ny
    const span = da - db
    if (Math.abs(span) < 1e-12) return a
    const t = da / span
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]
  }
  const out = []
  _.forEach(poly, (cur, i) => {
    const prev = poly[(i + poly.length - 1) % poly.length]
    const curIn = inside(cur)
    const prevIn = inside(prev)
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur))
      out.push(cur)
    } else if (prevIn) {
      out.push(intersect(prev, cur))
    }
  })
  return out
}

export const polygonCentroid = (points) => {
  let area = 0
  let x = 0
  let y = 0
  _.forEach(points, (cur, i) => {
    const next = points[(i + 1) % points.length]
    const cross = cur[0] * next[1] - next[0] * cur[1]
    area += cross
    x += (cur[0] + next[0]) * cross
    y += (cur[1] + next[1]) * cross
  })
  if (Math.abs(area) < 1e-12) return points[0]
  area *= 0.5
  return [x / (6 * area), y / (6 * area)]
}
