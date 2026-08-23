import _ from "lodash"

const CX = 0.5
const CY = 0.5
const OUTER_R = 0.48
const LLOYD_STEPS = 12
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const SITE_LIMIT = 0.93


export const seedFromAddress = (address) => {
  return parseInt(String(address).replace("0x", "").slice(0, 8), 16)
}

export const seedFromSettle = (settle) => {
  const { id } = settle || {}
  if (!id) return
  const n = parseInt(String(id).replace("0x", "").slice(0, 8), 16)
  if (!_.isFinite(n)) return
  return n
}

export const randomMapSeed = () => {
  const bytes = new Uint32Array(1)
  if (globalThis.crypto && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
    return bytes[0]
  }
  return Math.floor(Math.random() * 0xffffffff) >>> 0
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
  const shape = mapShape()
  const split = houseSplit(wins, count)
  let sites = radialSites(wins, rng, 0, split * 0.96, shape)
  if (loses) sites = sites.concat(radialSites(loses, rng, split * 1.04, SITE_LIMIT, shape))
  _.times(LLOYD_STEPS, () => {
    sites = _.map(sites, (site, index) => {
      const points = voronoiCell(site, index, sites, shape.bounds)
      if (points.length < 3) return site
      return keepBand(polygonCentroid(points), shape, index >= wins, split)
    })
  })
  const packed = _.map(sites, (site, index) => {
    let points = voronoiCell(site, index, sites, shape.bounds)
    if (index >= wins) points = flattenRim(points, shape, rng)
    const center = polygonCentroid(points)
    return {
      points,
      center,
      rho: shapeRho(center, shape),
      ang: Math.atan2(center[1] - CY, center[0] - CX)
    }
  })
  const inner = _.sortBy(packed.slice(0, wins), "rho")
  const outer = _.sortBy(packed.slice(wins), "ang")
  return _.keyBy(_.map(inner.concat(outer), (cell, index) => {
    const { points, center } = cell
    const r = cellRadius(points, center)
    let round = r * 0.22
    if (round > 0.016) round = 0.016
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

const mapShape = () => {
  const rim = () => OUTER_R
  const bounds = _.times(96, (i) => {
    const ang = (i / 96) * Math.PI * 2 - Math.PI / 2
    return [CX + OUTER_R * Math.cos(ang), CY + OUTER_R * Math.sin(ang)]
  })
  return { rim, bounds }
}

const flattenRim = (points, shape, rng) => {
  if (!points || points.length < 4) return points
  const n = points.length
  const onRim = _.map(points, (point) => shapeRho(point, shape) >= 0.97)
  const rimCount = _.sumBy(onRim, (hit) => {
    if (hit) return 1
    return 0
  })
  if (rimCount < 3) return points
  let origin = 0
  if (onRim[0]) {
    origin = _.findLastIndex(onRim, (hit) => !hit)
    if (origin < 0) return points
    origin = (origin + 1) % n
  }
  const ordered = _.times(n, (k) => points[(origin + k) % n])
  const orderedRim = _.times(n, (k) => onRim[(origin + k) % n])
  const out = []
  let i = 0
  while (i < n) {
    if (!orderedRim[i]) {
      out.push(ordered[i])
      i += 1
      continue
    }
    const a = ordered[i]
    let j = i
    while (j < n && orderedRim[j]) j += 1
    const b = ordered[j - 1]
    out.push(a)
    if (j - 1 > i) {
      const mx = (a[0] + b[0]) * 0.5
      const my = (a[1] + b[1]) * 0.5
      const dx = mx - CX
      const dy = my - CY
      const dist = Math.hypot(dx, dy) || 1
      const bump = (rng() - 0.38) * 0.034
      let px = mx + dx / dist * bump
      let py = my + dy / dist * bump
      const pr = Math.hypot(px - CX, py - CY)
      if (pr > 0.495) {
        const s = 0.495 / pr
        px = CX + (px - CX) * s
        py = CY + (py - CY) * s
      }
      out.push([px, py])
      out.push(b)
    }
    i = j
  }
  if (out.length < 3) return points
  return out
}

const shapePoint = (rho, theta, shape) => {
  const r = shape.rim(theta) * rho
  return [CX + r * Math.cos(theta), CY + r * Math.sin(theta)]
}

const shapeRho = (point, shape) => {
  const dx = point[0] - CX
  const dy = point[1] - CY
  const dist = Math.hypot(dx, dy)
  const r = shape.rim(Math.atan2(dy, dx))
  if (r < 1e-6) return 0
  return dist / r
}

const houseSplit = (wins, count) => {
  if (count <= wins) return 1
  return Math.sqrt(wins / count)
}

const radialSites = (count, rng, rho0, rho1, shape) => {
  if (count <= 0) return []
  if (count === 1 && rho0 < 0.08) return [[CX, CY]]
  const turn = rng() * Math.PI * 2
  const a = rho0 * rho0
  const b = rho1 * rho1
  return _.map(_.range(count), (i) => {
    const rho = Math.sqrt(a + (b - a) * (i + 0.5) / count)
    const theta = i * GOLDEN + turn
    return shapePoint(rho, theta, shape)
  })
}

const clampSite = (point, shape, limit) => {
  const rho = shapeRho(point, shape)
  if (rho <= limit) return point
  const s = limit / rho
  return [CX + (point[0] - CX) * s, CY + (point[1] - CY) * s]
}

const keepBand = (point, shape, isHouse, split) => {
  const next = clampSite(point, shape, SITE_LIMIT)
  if (split >= 1) return next
  const rho = shapeRho(next, shape)
  if (isHouse) {
    const minR = split + 0.03
    if (rho >= minR) return next
    const s = minR / Math.max(rho, 1e-6)
    return clampSite([CX + (next[0] - CX) * s, CY + (next[1] - CY) * s], shape, SITE_LIMIT)
  }
  const maxR = split - 0.02
  if (rho <= maxR) return next
  const s = maxR / rho
  return [CX + (next[0] - CX) * s, CY + (next[1] - CY) * s]
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
