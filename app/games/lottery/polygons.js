import _ from "lodash"

const CX = 0.5
const CY = 0.5
const OUTER_R = 0.48
const INNER_R = 0.26
const RING_R = 0.4
const LLOYD_STEPS = 4
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const BOUNDS = _.times(96, (i) => {
  const t = (i / 96) * Math.PI * 2 - Math.PI / 2
  return [CX + OUTER_R * Math.cos(t), CY + OUTER_R * Math.sin(t)]
})


export const seedFromAddress = (address) => {
  return parseInt(String(address).replace("0x", "").slice(0, 8), 16)
}

export const buildPolygons = (seed, count, winCount) => {
  const rng = mulberry32(seed >>> 0)
  let wins = count
  if (winCount) wins = winCount
  const loses = count - wins
  const outer = ringSites(loses, rng)
  let inner = diskSites(wins, rng)
  _.times(LLOYD_STEPS, () => {
    const sites = inner.concat(outer)
    inner = _.map(inner, (site, index) => {
      const points = voronoiCell(site, index, sites)
      if (points.length < 3) return site
      const next = polygonCentroid(points)
      const dx = next[0] - CX
      const dy = next[1] - CY
      const dist = Math.hypot(dx, dy)
      if (dist <= INNER_R) return next
      return [CX + (dx / dist) * INNER_R, CY + (dy / dist) * INNER_R]
    })
  })
  const sites = inner.concat(outer)
  return _.map(sites, (site, index) => {
    const points = voronoiCell(site, index, sites)
    const center = polygonCentroid(points)
    return {
      id: index,
      x: center[0],
      y: center[1],
      r: cellRadius(points, center),
      raw: points,
      points,
      path: polygonPath(points),
      angle: splitAngle(index)
    }
  })
}

export const splitLobes = (cell) => {
  const { raw, points, x, y, angle } = cell || {}
  const source = raw || points
  if (!source || source.length < 3) return []
  const nx = Math.cos(angle)
  const ny = Math.sin(angle)
  const left = clipHalfPlane(source, nx, ny, x, y)
  const right = clipHalfPlane(source, -nx, -ny, x, y)
  if (left.length < 3 || right.length < 3) return []
  return [
    { points: left, path: polygonPath(left), center: polygonCentroid(left) },
    { points: right, path: polygonPath(right), center: polygonCentroid(right) }
  ]
}

export const cellSpinOrder = (seed, count, winCount) => {
  const polygons = buildPolygons(seed, count, winCount)
  return _.map(_.sortBy(polygons, (polygon) => {
    return Math.atan2(polygon.y - 0.5, polygon.x - 0.5)
  }), "id")
}

export const BORDER_STROKE = "var(--cs-elevated)"
export const BORDER_WIDTH = 0.012

export const ownerFill = (address, isMine) => {
  if (!address) return "color-mix(in srgb, var(--cs-accent) 10%, var(--cs-bg))"
  if (isMine) return "var(--cs-accent)"
  return "color-mix(in srgb, var(--cs-accent-2) 42%, var(--cs-elevated))"
}

export const ownerStroke = (address, isMine) => {
  if (!address) return "var(--cs-border)"
  if (isMine) return "var(--cs-accent)"
  return "var(--cs-accent-2)"
}

export const plusFill = (plus, isMine) => {
  if (plus === 3) return "#fbbf24"
  if (plus === 2) {
    if (isMine) return "#5eead4"
    return "color-mix(in srgb, #5eead4 55%, var(--cs-elevated))"
  }
  if (isMine) return "var(--cs-accent)"
  return "color-mix(in srgb, var(--cs-accent) 48%, var(--cs-elevated))"
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

const splitAngle = (id) => (id + 1) * GOLDEN

const polygonPath = (points) => {
  if (!points || points.length < 3) return ""
  return `M${_.map(points, (point) => `${point[0]},${point[1]}`).join("L")}Z`
}

const cellRadius = (points, center) => {
  let max = 0.04
  _.forEach(points, (point) => {
    const d = Math.hypot(point[0] - center[0], point[1] - center[1])
    if (d > max) max = d
  })
  return max
}

const diskSites = (count, rng) => {
  return _.map(_.range(count), (i) => {
    const r = INNER_R * Math.sqrt((i + 0.5) / count)
    const theta = i * GOLDEN + (rng() - 0.5) * 0.35
    return [CX + r * Math.cos(theta), CY + r * Math.sin(theta)]
  })
}

const ringSites = (count, rng) => {
  return _.map(_.range(count), (i) => {
    const jitter = (rng() - 0.5) * (0.55 / Math.max(count, 1))
    const theta = ((i + 0.5) / count) * Math.PI * 2 + jitter
    const r = RING_R + (rng() - 0.5) * 0.016
    return [CX + r * Math.cos(theta), CY + r * Math.sin(theta)]
  })
}

const voronoiCell = (site, index, sites) => {
  let poly = BOUNDS
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
