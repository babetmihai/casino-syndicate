import _ from "lodash"

const SQUARE = [[0, 0], [1, 0], [1, 1], [0, 1]]
const LLOYD_STEPS = 3


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
      return polygonCentroid(points)
    })
  })
  const sites = inner.concat(outer)
  return _.map(sites, (site, index) => {
    const points = insetPoints(voronoiCell(site, index, sites))
    return {
      id: index,
      points,
      area: polygonArea(points)
    }
  })
}

export const cellSpinOrder = (seed, count, winCount) => {
  const polygons = buildPolygons(seed, count, winCount)
  return _.map(_.sortBy(polygons, (polygon) => {
    const center = polygonCentroid(polygon.points)
    return Math.atan2(center[1] - 0.5, center[0] - 0.5)
  }), "id")
}

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

const CELL_INSET = 0.006

const insetPoints = (points) => {
  const c = polygonCentroid(points)
  return _.map(points, (point) => {
    const dx = c[0] - point[0]
    const dy = c[1] - point[1]
    const len = Math.hypot(dx, dy)
    if (len < 1e-9) return point
    let move = CELL_INSET
    if (move > len * 0.35) move = len * 0.35
    return [point[0] + (dx / len) * move, point[1] + (dy / len) * move]
  })
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const INNER_R = 0.3
const RING_INSET = 0.07

const diskSites = (count, rng) => {
  return _.map(_.range(count), (i) => {
    const r = INNER_R * Math.sqrt((i + 0.5) / count)
    const theta = i * GOLDEN + (rng() - 0.5) * 0.35
    return [
      _.clamp(0.5 + r * Math.cos(theta), 0.18, 0.82),
      _.clamp(0.5 + r * Math.sin(theta), 0.18, 0.82)
    ]
  })
}

const ringSites = (count, rng) => {
  const side = 1 - 2 * RING_INSET
  const perim = 4 * side
  return _.map(_.range(count), (i) => {
    const jitter = (rng() - 0.5) * 0.4
    let u = (i + 0.5 + jitter) / count
    u = (u % 1 + 1) % 1
    const d = u * perim
    let x = RING_INSET
    let y = RING_INSET
    if (d < side) {
      x = RING_INSET + d
      y = RING_INSET
    } else if (d < 2 * side) {
      x = 1 - RING_INSET
      y = RING_INSET + (d - side)
    } else if (d < 3 * side) {
      x = 1 - RING_INSET - (d - 2 * side)
      y = 1 - RING_INSET
    } else {
      x = RING_INSET
      y = 1 - RING_INSET - (d - 3 * side)
    }
    return [
      _.clamp(x, 0.04, 0.96),
      _.clamp(y, 0.04, 0.96)
    ]
  })
}

const voronoiCell = (site, index, sites) => {
  let poly = SQUARE
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
    const t = da / (da - db)
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

export const cellNumber = (id) => id + 1

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

const polygonArea = (points) => {
  let area = 0
  _.forEach(points, (cur, i) => {
    const next = points[(i + 1) % points.length]
    area += cur[0] * next[1] - next[0] * cur[1]
  })
  return Math.abs(area) / 2
}
