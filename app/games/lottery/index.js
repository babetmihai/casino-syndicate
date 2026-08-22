import { ethers } from "ethers"
import { actions } from "app/core/store"
import { EMPTY_OBJECT } from "app/core"
import { generateContract, getContract, sendTx, sendWalletTx } from "app/core/contracts"
import { selectAuth } from "app/core/auth"
import { clampEth, formatEth, parseEth } from "app/games/roulette/chips"
import LotteryArtifact from "artifacts/contracts/Lottery.sol/Lottery.json"
import _ from "lodash"

export const MIN_POLYGONS = 3
export const MAX_POLYGONS = 48
export const ticketGas = 3000000n
export const BONUS_SPARK = 1
export const BONUS_NUCLEUS = 2
export const BONUS_NOVA = 3

const unpackBonus = (bits, count) => {
  const raw = BigInt(bits || 0)
  return _.times(count || 0, (index) => Number((raw >> BigInt(index * 2)) & 3n))
}

export const bonusPayout = (kind, ticketPrice, polygonCount, loseCount) => {
  const price = clampEth(ticketPrice)
  const cells = (polygonCount || 0) + (loseCount || 0)
  if (kind === BONUS_SPARK) return price
  if (kind === BONUS_NUCLEUS) return price * cells
  if (kind === BONUS_NOVA) return price * cells * (polygonCount || 0)
  return 0
}

export const jackpotByPlayer = (lottery) => {
  const { ticketPrice, polygonCount, loseCount, owners = [], mates = [], bonuses = [] } = lottery || {}
  const amounts = {}
  _.forEach(_.take(owners, polygonCount || 0), (owner, index) => {
    if (!owner) return
    if (!amounts[owner]) amounts[owner] = 0
    const mate = mates[index]
    if (mate && !amounts[mate]) amounts[mate] = 0
    const extra = bonusPayout(bonuses[index], ticketPrice, polygonCount, loseCount)
    if (!extra) return
    if (!mate) {
      amounts[owner] += extra
      return
    }
    amounts[owner] += extra / 2
    amounts[mate] += extra / 2
  })
  return amounts
}

export const jackpotQuote = (lottery, account) => {
  const amounts = jackpotByPlayer(lottery) || {}
  if (account) {
    const mine = amounts[ethers.getAddress(account)]
    if (mine) return mine
    return 0
  }
  return _.sum(_.values(amounts))
}

const lotteryPath = (address) => `games.lottery.${ethers.getAddress(address)}`


export const selectLottery = (address) => {
  if (!address || !ethers.isAddress(address)) return EMPTY_OBJECT
  return actions.get(lotteryPath(address), EMPTY_OBJECT)
}

export const fetchLottery = async (address) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address, LotteryArtifact.abi)
  const { account } = selectAuth() || {}
  let overrides = {}
  if (account) overrides = { from: account }
  const row = await contract.getTable.staticCall(overrides)
  const owners = _.map(row.owners || [], (item) => {
    if (!item || item === ethers.ZeroAddress) return null
    return ethers.getAddress(item)
  })
  const mates = _.map(row.mates || [], (item) => {
    if (!item || item === ethers.ZeroAddress) return null
    return ethers.getAddress(item)
  })
  const ownerRaw = row.owner
  let owner
  if (ownerRaw && ownerRaw !== ethers.ZeroAddress) owner = ethers.getAddress(ownerRaw)
  const tableAddress = ethers.getAddress(address)
  actions.update(lotteryPath(address), {
    polygonCount: Number(row.polygonCount),
    loseCount: Number(row.loseCount),
    ticketPrice: formatEth(await contract.ticketPrice()),
    claimedCount: Number(row.claimedCount),
    loseLit: Number(row.loseLit),
    prize: formatEth(row.prize),
    mates,
    bonuses: unpackBonus(row.bonusBits, Number(row.polygonCount) + Number(row.loseCount)),
    myPrize: formatEth(row.myPrize),
    memberShares: formatEth(row.memberShares),
    totalBalance: formatEth(row.totalBalance),
    lastWithdrawAt: Number(row.lastWithdrawAt),
    owner,
    owners
  })
  if (owner) {
    actions.update(`tables.${tableAddress}`, { createdBy: owner })
  }
}


const lotteryWatches = {}

export const watchLottery = (address) => {
  if (!address || !ethers.isAddress(address)) return
  const key = ethers.getAddress(address)
  if (lotteryWatches[key]) return
  const refresh = _.debounce(() => fetchLottery(address), 200)
  lotteryWatches[key] = { refresh, timer: setInterval(refresh, 1500) }
}

export const unwatchLottery = (address) => {
  if (!address || !ethers.isAddress(address)) return
  const key = ethers.getAddress(address)
  const watch = lotteryWatches[key]
  if (!watch) return
  const { refresh, timer } = watch || {}
  clearInterval(timer)
  refresh.cancel()
  delete lotteryWatches[key]
}

export const buyLotteryTicket = async (address) => {
  const contract = await generateContract(address, LotteryArtifact.abi)
  const price = await contract.ticketPrice()
  const receipt = await sendTx(contract.buyTicket, [], {
    value: price,
    gasLimit: ticketGas
  })
  const lastTicket = readTicket(contract, receipt)
  if (lastTicket) actions.update(lotteryPath(address), { lastTicket })
  return lastTicket
}


export const withdrawLotteryPrize = async (address) => {
  const contract = await generateContract(address, LotteryArtifact.abi)
  await sendTx(contract.withdrawPrize, [])
  await fetchLottery(address)
}

export const depositLotteryShares = async ({ balance }, address) => {
  const contract = await generateContract(address, LotteryArtifact.abi)
  await sendWalletTx(contract.depositShares, [], {
    value: parseEth(balance)
  })
  await fetchLottery(address)
}

export const withdrawLotteryShares = async ({ balance }, address) => {
  const contract = await generateContract(address, LotteryArtifact.abi)
  await sendWalletTx(contract.withdrawShares, [parseEth(balance)])
  await fetchLottery(address)
}


const readTicket = (contract, receipt) => {
  const { logs = [] } = receipt || {}
  const draws = []
  let settled = false
  let playersWin
  let roundPrize
  let roundOwners
  let roundMates
  let roundBonuses
  for (const log of logs) {
    try {
      const parsed = contract.interface.parseLog(log)
      const { name, args = {} } = parsed || {}
      if (name === "Settled") {
        settled = true
        roundPrize = formatEth(args.prize)
        playersWin = args.playersWin
        roundOwners = _.map(args.owners || [], (item) => {
          if (!item || item === ethers.ZeroAddress) return null
          return ethers.getAddress(item)
        })
        roundMates = _.map(args.mates || [], (item) => {
          if (!item || item === ethers.ZeroAddress) return null
          return ethers.getAddress(item)
        })
        roundBonuses = unpackBonus(args.bonusBits, roundOwners.length)
      }
      if (name !== "TicketBought") continue
      draws.push({
        won: args.won,
        polygonId: Number(args.polygonId),
        assigned: args.assigned,
        split: Boolean(args.split),
        bonus: Number(args.bonus)
      })
    } catch {
      // ignore logs from other contracts
    }
  }
  if (draws.length === 0) return
  const claimed = _.filter(draws, "assigned")
  const last = _.last(claimed) || _.last(draws)
  const splitIds = _.uniq(_.map(_.filter(draws, "split"), "polygonId"))
  const bonusIds = _.uniq(_.map(_.filter(draws, "bonus"), "polygonId"))
  const takenIds = _.uniq(_.map(_.filter(draws, (draw) => {
    return draw.won && !draw.assigned && !draw.split && !draw.bonus
  }), "polygonId"))
  const loseIds = _.uniq(_.map(_.filter(draws, (draw) => !draw.won), "polygonId"))
  return {
    ...last,
    assignedCount: claimed.length,
    wonCount: _.filter(draws, "won").length,
    loseAssignedCount: _.filter(draws, (draw) => draw.assigned && !draw.won).length,
    winAssignedCount: _.filter(draws, (draw) => draw.assigned && draw.won).length,
    drawCount: draws.length,
    draws,
    takenIds,
    loseIds,
    splitIds,
    bonusIds,
    settled,
    playersWin,
    roundPrize,
    roundOwners,
    roundMates,
    roundBonuses
  }
}
