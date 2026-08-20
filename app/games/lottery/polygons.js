import _ from "lodash"

const SQUARE = [[0, 0], [1, 0], [1, 1], [0, 1]]
const LLOYD_STEPS = 3


export const seedFromAddress = (address) => {
  return parseInt(String(address).replace("0x", "").slice(0, 8), 16)
}

export const buildPolygons = (seed, count) => {
  const rng = mulberry32(seed >>> 0)
  let sites = jitteredSites(count, rng)
  _.times(LLOYD_STEPS, () => {
    const cells = _.map(sites, (site, index) => voronoiCell(site, index, sites))
    sites = _.map(cells, (points, index) => {
      if (points.length < 3) return sites[index]
      return centroid(points)
    })
  })
  return _.map(sites, (site, index) => {
    const points = voronoiCell(site, index, sites)
    return {
      id: index,
      points,
      area: polygonArea(points)
    }
  })
}

export const ownerFill = (address, isMine) => {
  if (!address) return "var(--color-cs-elevated)"
  if (isMine) return "rgb(45 212 191 / 0.42)"
  const hue = ownerHue(address)
  return `hsl(${hue} 42% 36% / 0.78)`
}

export const ownerStroke = (address, isMine) => {
  if (!address) return "var(--color-cs-border)"
  if (isMine) return "var(--color-cs-accent)"
  const hue = ownerHue(address)
  return `hsl(${hue} 48% 62%)`
}


const ownerHue = (address) => parseInt(String(address).slice(2, 8), 16) % 360

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

const jitteredSites = (count, rng) => {
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  return _.map(_.range(count), (index) => {
    const row = Math.floor(index / cols)
    const col = index % cols
    let colsInRow = cols
    if (row === rows - 1) colsInRow = count - row * cols
    const x = (col + 0.5) / colsInRow
    const y = (row + 0.5) / rows
    const jx = (rng() - 0.5) * 0.55 / colsInRow
    const jy = (rng() - 0.5) * 0.55 / rows
    return [
      _.clamp(x + jx, 0.04, 0.96),
      _.clamp(y + jy, 0.04, 0.96)
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

const centroid = (points) => {
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
