const { expect } = require("chai")
const { ethers } = require("hardhat")

const TABLE_TYPES = { Roulette: "Roulette", Polygons: "Polygons", Blackjack: "Blackjack" }
const TABLE_TYPE_IDS = { [TABLE_TYPES.Roulette]: 0, [TABLE_TYPES.Polygons]: 1, [TABLE_TYPES.Blackjack]: 2 }
const TABLE_TYPE_BY_ID = { 0: TABLE_TYPES.Roulette, 1: TABLE_TYPES.Polygons, 2: TABLE_TYPES.Blackjack }

const toTable = ({ game, createdBy, createdAt, gameType }) => {
  const address = ethers.getAddress(game)
  return {
    address,
    createdBy: ethers.getAddress(createdBy),
    createdAt: Number(createdAt),
    type: TABLE_TYPE_BY_ID[Number(gameType)]
  }
}

describe("UI flow: create, view, play roulette", () => {
  it("creates a table, lists it, loads it, funds it, and posts a bet", async () => {
    const [creator, player] = await ethers.getSigners()

    const Factory = await ethers.getContractFactory("GameFactory")
    const factory = await Factory.deploy()
    await factory.waitForDeployment()

    const createTx = await factory.connect(creator).createGame(
      TABLE_TYPE_IDS.Roulette,
      ethers.parseEther("0.01"),
      ethers.parseEther("1"),
      0,
      {
        value: ethers.parseEther("100")
      }
    )
    const receipt = await createTx.wait()

    let createdAddress
    for (const log of receipt.logs) {
      try {
        const parsed = factory.interface.parseLog(log)
        if (parsed && parsed.name === "GameCreated") {
          createdAddress = parsed.args.game
          break
        }
      } catch {
        // ignore logs from other contracts
      }
    }

    expect(createdAddress, "GameCreated event not found").to.be.a("string")

    const rows = await factory.getGamesByCreator(creator.address)
    expect(rows.length).to.equal(1)
    const listed = toTable(rows[0])
    expect(listed.address).to.equal(ethers.getAddress(createdAddress))
    expect(listed.createdBy).to.equal(creator.address)
    expect(listed.type).to.equal(TABLE_TYPES.Roulette)

    const loaded = toTable(await factory.getGame(createdAddress))
    expect(loaded).to.deep.include({
      address: listed.address,
      createdBy: creator.address,
      type: TABLE_TYPES.Roulette
    })

    const roulette = await ethers.getContractAt("Roulette", createdAddress)
    expect(await ethers.provider.getBalance(createdAddress)).to.equal(ethers.parseEther("100"))
    expect(await ethers.provider.getBalance(factory.target)).to.equal(0n)

    const afterCreate = await roulette.connect(creator).getTable()
    expect(afterCreate.memberShares).to.equal(ethers.parseEther("100"))
    expect(afterCreate.totalShares).to.equal(ethers.parseEther("100"))
    expect(afterCreate.totalBalance).to.equal(ethers.parseEther("100"))
    expect(afterCreate[0]).to.equal(afterCreate.memberShares)
    expect(afterCreate[2]).to.equal(afterCreate.totalShares)
    expect(afterCreate[3]).to.equal(afterCreate.totalBalance)

    const asPlayer = await roulette.connect(player).getTable()
    expect(asPlayer[0]).to.equal(0n)
    expect(asPlayer[3]).to.equal(ethers.parseEther("100"))

    await (await roulette.connect(creator).depositShares({ value: ethers.parseEther("2") })).wait()
    const afterTopUp = await roulette.connect(creator).getTable()
    expect(afterTopUp.totalBalance).to.equal(ethers.parseEther("102"))
    expect(afterTopUp.memberShares).to.equal(ethers.parseEther("102"))
    expect(afterTopUp.totalShares).to.equal(ethers.parseEther("102"))

    const bets = Array(157).fill(0n)
    bets[0] = ethers.parseEther("1")
    const betTx = await roulette.connect(player).postBet(bets, { value: ethers.parseEther("1") })
    const betReceipt = await betTx.wait()
    const winEvent = betReceipt.logs
      .map((log) => {
        try {
          return roulette.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === "WinningNumber")

    expect(winEvent, "WinningNumber event not found").to.not.equal(undefined)
    expect(winEvent.args.totalBetAmount).to.equal(ethers.parseEther("1"))
  })

  it("keeps the owner at 100% of the bankroll after a house win and a top-up", async () => {
    const [creator, player] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory("GameFactory")
    const factory = await Factory.deploy()
    await factory.waitForDeployment()

    const createTx = await factory.connect(creator).createGame(
      TABLE_TYPE_IDS.Roulette,
      ethers.parseEther("0.01"),
      ethers.parseEther("1"),
      0,
      {
        value: ethers.parseEther("100")
      }
    )
    const receipt = await createTx.wait()
    const created = receipt.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === "GameCreated")
    const roulette = await ethers.getContractAt("Roulette", created.args.game)

    const bets = Array(157).fill(0n)
    for (let i = 0; i < 37; i++) bets[i] = ethers.parseEther("1")
    await (await roulette.connect(player).postBet(bets, { value: ethers.parseEther("37") })).wait()

    const afterBet = await roulette.connect(creator).getTable()
    expect(afterBet.totalBalance).to.equal(ethers.parseEther("101"))
    expect(afterBet.memberShares).to.equal(ethers.parseEther("101"))

    await (await roulette.connect(creator).depositShares({ value: ethers.parseEther("10") })).wait()
    const afterFund = await roulette.connect(creator).getTable()
    expect(afterFund.totalBalance).to.equal(ethers.parseEther("111"))
    expect(afterFund.memberShares).to.equal(ethers.parseEther("111"))
    expect(afterFund.totalShares).to.equal(ethers.parseEther("111"))
  })

  it("pays even-money and dozen bets from the winning number", async () => {
    const [creator, player] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory("GameFactory")
    const factory = await Factory.deploy()
    await factory.waitForDeployment()
    const createTx = await factory.connect(creator).createGame(
      TABLE_TYPE_IDS.Roulette,
      ethers.parseEther("0.01"),
      ethers.parseEther("1"),
      0,
      {
        value: ethers.parseEther("100")
      }
    )
    const receipt = await createTx.wait()
    const created = receipt.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === "GameCreated")
    const roulette = await ethers.getContractAt("Roulette", created.args.game)

    const red = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
    const bets = Array(157).fill(0n)
    bets[37] = ethers.parseEther("1")
    bets[43] = ethers.parseEther("1")
    const betTx = await roulette.connect(player).postBet(bets, { value: ethers.parseEther("2") })
    const betReceipt = await betTx.wait()
    const winEvent = betReceipt.logs
      .map((log) => {
        try {
          return roulette.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === "WinningNumber")

    const n = Number(winEvent.args.number)
    let expected = 0n
    if (n !== 0) {
      if (red.includes(n)) expected += ethers.parseEther("2")
      if (n <= 12) expected += ethers.parseEther("3")
    }
    expect(winEvent.args.totalBetAmount).to.equal(ethers.parseEther("2"))
    expect(winEvent.args.winningAmount).to.equal(expected)
  })

  it("pays splits, streets, corners, and lines from the winning number", async () => {
    const [creator, player] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory("GameFactory")
    const factory = await Factory.deploy()
    await factory.waitForDeployment()
    const createTx = await factory.connect(creator).createGame(
      TABLE_TYPE_IDS.Roulette,
      ethers.parseEther("0.01"),
      ethers.parseEther("1"),
      0,
      {
        value: ethers.parseEther("100")
      }
    )
    const receipt = await createTx.wait()
    const created = receipt.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === "GameCreated")
    const roulette = await ethers.getContractAt("Roulette", created.args.game)

    const unit = ethers.parseEther("1")
    const bets = Array(157).fill(0n)
    bets[49] = unit
    bets[109] = unit
    bets[124] = unit
    bets[146] = unit
    bets[121] = unit
    bets[145] = unit
    const betTx = await roulette.connect(player).postBet(bets, { value: ethers.parseEther("6") })
    const betReceipt = await betTx.wait()
    const winEvent = betReceipt.logs
      .map((log) => {
        try {
          return roulette.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === "WinningNumber")

    const n = Number(winEvent.args.number)
    let expected = 0n
    if (n === 2 || n === 3) expected += unit * 18n
    if (n >= 1 && n <= 3) expected += unit * 12n
    if ([1, 2, 4, 5].includes(n)) expected += unit * 9n
    if (n >= 1 && n <= 6) expected += unit * 6n
    if (n <= 2) expected += unit * 12n
    if (n <= 3) expected += unit * 9n
    expect(winEvent.args.totalBetAmount).to.equal(ethers.parseEther("6"))
    expect(winEvent.args.winningAmount).to.equal(expected)
  })

  it("sets min and max when the table is created", async () => {
    const [creator] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory("GameFactory")
    const factory = await Factory.deploy()
    await factory.waitForDeployment()
    const createTx = await factory.connect(creator).createGame(
      TABLE_TYPE_IDS.Roulette,
      ethers.parseEther("0.05"),
      ethers.parseEther("0.5"),
      0,
      {
        value: ethers.parseEther("100")
      }
    )
    const receipt = await createTx.wait()
    const created = receipt.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === "GameCreated")
    const roulette = await ethers.getContractAt("Roulette", created.args.game)

    const afterCreate = await roulette.connect(creator).getTable()
    expect(afterCreate.minBet).to.equal(ethers.parseEther("0.05"))
    expect(afterCreate.maxBet).to.equal(ethers.parseEther("0.5"))

    await expect(
      factory.connect(creator).createGame(
        TABLE_TYPE_IDS.Roulette,
        ethers.parseEther("0.05"),
        ethers.parseEther("0.01"),
        0,
        { value: ethers.parseEther("1") }
      )
    ).to.be.revertedWith("Max below min")
  })

  it("rejects bets outside table limits", async () => {
    const [creator, player] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory("GameFactory")
    const factory = await Factory.deploy()
    await factory.waitForDeployment()
    const createTx = await factory.connect(creator).createGame(
      TABLE_TYPE_IDS.Roulette,
      ethers.parseEther("0.01"),
      ethers.parseEther("0.01"),
      0,
      {
        value: ethers.parseEther("1")
      }
    )
    const receipt = await createTx.wait()
    const created = receipt.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === "GameCreated")
    const roulette = await ethers.getContractAt("Roulette", created.args.game)

    const belowMin = Array(157).fill(0n)
    belowMin[0] = ethers.parseEther("0.001")
    await expect(
      roulette.connect(player).postBet(belowMin, { value: ethers.parseEther("0.001") })
    ).to.be.revertedWith("Bet amount must be at least minBet")

    const aboveMax = Array(157).fill(0n)
    aboveMax[1] = ethers.parseEther("0.02")
    await expect(
      roulette.connect(player).postBet(aboveMax, { value: ethers.parseEther("0.02") })
    ).to.be.revertedWith("Bet amount must be less than maxBetAmount")
  })

  it("requires a 1 ETH deposit and allows withdraw once per day", async () => {
    const [creator, player] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory("GameFactory")
    const factory = await Factory.deploy()
    await factory.waitForDeployment()

    await expect(
      factory.connect(creator).createGame(
        TABLE_TYPE_IDS.Roulette,
        ethers.parseEther("0.01"),
        ethers.parseEther("0.01"),
        0,
        {
          value: ethers.parseEther("0.99")
        }
      )
    ).to.be.revertedWith("Min deposit 1")

    const createTx = await factory.connect(creator).createGame(
      TABLE_TYPE_IDS.Roulette,
      ethers.parseEther("0.01"),
      ethers.parseEther("0.01"),
      0,
      {
        value: ethers.parseEther("1")
      }
    )
    const receipt = await createTx.wait()
    const created = receipt.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === "GameCreated")
    const roulette = await ethers.getContractAt("Roulette", created.args.game)

    const open = await roulette.connect(creator).getTable()
    expect(open.lastWithdrawAt).to.equal(0n)
    expect(open.maxBet).to.equal(ethers.parseEther("0.01"))

    await (await roulette.connect(creator).withdrawShares(ethers.parseEther("0.5"))).wait()
    const afterWithdraw = await roulette.connect(creator).getTable()
    expect(afterWithdraw.totalBalance).to.equal(ethers.parseEther("0.5"))
    expect(afterWithdraw.lastWithdrawAt).to.be.greaterThan(0n)

    const bets = Array(157).fill(0n)
    bets[0] = ethers.parseEther("0.01")
    await (await roulette.connect(player).postBet(bets, { value: ethers.parseEther("0.01") })).wait()

    await expect(
      roulette.connect(creator).withdrawShares(ethers.parseEther("0.01"))
    ).to.be.revertedWith("Once per day")

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60])
    await ethers.provider.send("evm_mine")
    await (await roulette.connect(creator).withdrawShares(ethers.parseEther("0.01"))).wait()
  })

  it("keeps the creator as owner after another player deposits and withdraws", async () => {
    const [creator, player] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory("GameFactory")
    const factory = await Factory.deploy()
    await factory.waitForDeployment()
    const createTx = await factory.connect(creator).createGame(
      TABLE_TYPE_IDS.Roulette,
      ethers.parseEther("0.01"),
      ethers.parseEther("0.05"),
      0,
      {
        value: ethers.parseEther("1")
      }
    )
    const receipt = await createTx.wait()
    const created = receipt.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === "GameCreated")
    const game = created.args.game
    const roulette = await ethers.getContractAt("Roulette", game)

    expect(await roulette.createdBy()).to.equal(creator.address)
    expect((await factory.getGame(game)).createdBy).to.equal(creator.address)

    await (await roulette.connect(player).depositShares({ value: ethers.parseEther("2") })).wait()
    expect(await roulette.createdBy()).to.equal(creator.address)
    expect((await factory.getGame(game)).createdBy).to.equal(creator.address)
    expect((await factory.getGamesByCreator(creator.address)).length).to.equal(1)
    expect((await factory.getGamesByCreator(player.address)).length).to.equal(0)
    expect((await roulette.connect(player).getTable()).owner).to.equal(creator.address)

    await (await roulette.connect(creator).depositShares({ value: ethers.parseEther("3") })).wait()
    expect(await roulette.createdBy()).to.equal(creator.address)
    expect((await factory.getGamesByCreator(creator.address)).length).to.equal(1)
    expect((await factory.getGamesByCreator(player.address)).length).to.equal(0)

    await (await roulette.connect(creator).withdrawShares(ethers.parseEther("3.5"))).wait()
    expect(await roulette.createdBy()).to.equal(creator.address)
    expect((await factory.getGame(game)).createdBy).to.equal(creator.address)
    expect((await factory.getGamesByCreator(creator.address)).length).to.equal(1)
    expect((await factory.getGamesByCreator(player.address)).length).to.equal(0)
  })
})

describe("UI flow: create, view, play polygons", () => {
  const DEPOSIT = ethers.parseEther("1")

  const deployFactory = async () => {
    const Factory = await ethers.getContractFactory("GameFactory")
    const factory = await Factory.deploy()
    await factory.waitForDeployment()
    return factory
  }

  const createdAddress = (factory, receipt) => {
    const created = receipt.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === "GameCreated")
    return created.args.game
  }

  const createPolygons = (factory, creator, polygons, price) => {
    return factory.connect(creator).createGame(
      TABLE_TYPE_IDS.Polygons,
      polygons,
      0,
      price,
      { value: DEPOSIT }
    )
  }

  const parseTicket = (game, receipt) => {
    return receipt.logs
      .map((log) => {
        try {
          return game.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .filter((parsed) => parsed && parsed.name === "TicketBought")
      .map((parsed) => parsed.args)
  }

  const parsePaid = (game, receipt) => {
    return receipt.logs
      .map((log) => {
        try {
          return game.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .filter((parsed) => parsed && parsed.name === "PrizePaid")
      .map((parsed) => parsed.args)
  }

  const parseSettled = (game, receipt) => {
    return receipt.logs
      .map((log) => {
        try {
          return game.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === "Settled")
  }

  const playUntilSettled = async (game, signer, price, wantPlayers) => {
    for (let i = 0; i < 200; i++) {
      const table = await game.connect(signer).getTable()
      if (table.myPrize > 0n) {
        await (await game.connect(signer).withdrawPrize()).wait()
      }
      const tx = await game.connect(signer).buyTicket({ value: price })
      const receipt = await tx.wait()
      const settled = parseSettled(game, receipt)
      if (!settled) continue
      if (wantPlayers === undefined) return { settled, receipt }
      if (settled.args.playersWin === wantPlayers) return { settled, receipt }
    }
    throw new Error("round did not settle")
  }

  it("creates a polygons table, lists it, and loads polygon config", async () => {
    const [creator] = await ethers.getSigners()
    const factory = await deployFactory()
    const createTx = await createPolygons(factory, creator, 12, ethers.parseEther("0.05"))
    const receipt = await createTx.wait()
    const address = createdAddress(factory, receipt)

    const rows = await factory.getGamesByCreator(creator.address)
    expect(rows.length).to.equal(1)
    const listed = toTable(rows[0])
    expect(listed.address).to.equal(ethers.getAddress(address))
    expect(listed.createdBy).to.equal(creator.address)
    expect(listed.type).to.equal(TABLE_TYPES.Polygons)

    const game = await ethers.getContractAt("Polygons", address)
    const table = await game.connect(creator).getTable()
    expect(table.polygonCount).to.equal(12n)
    expect(table.loseCount).to.equal(11n)
    expect(table.ticketPrice).to.equal(ethers.parseEther("0.05"))
    expect(table.claimedCount).to.equal(0n)
    expect(table.prize).to.equal(0n)
    expect(table.totalBalance).to.equal(DEPOSIT)
    expect(table.memberShares).to.equal(DEPOSIT)
    expect(table.owners.length).to.equal(23)
  })

  it("rejects bad polygons params and wrong ticket price", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    await expect(
      factory.connect(creator).createGame(
        TABLE_TYPE_IDS.Polygons,
        2,
        0,
        ethers.parseEther("0.01"),
        { value: DEPOSIT }
      )
    ).to.be.revertedWith("Bad polygons")
    await expect(
      factory.connect(creator).createGame(
        TABLE_TYPE_IDS.Polygons,
        49,
        0,
        ethers.parseEther("0.01"),
        { value: DEPOSIT }
      )
    ).to.be.revertedWith("Bad polygons")
    await expect(
      factory.connect(creator).createGame(
        TABLE_TYPE_IDS.Polygons,
        12,
        0,
        ethers.parseEther("0.001"),
        { value: DEPOSIT }
      )
    ).to.be.revertedWith("Price too small")
    await expect(
      factory.connect(creator).createGame(
        TABLE_TYPE_IDS.Polygons,
        12,
        0,
        ethers.parseEther("0.01")
      )
    ).to.be.revertedWith("Min deposit 1")

    const createTx = await createPolygons(factory, creator, 4, ethers.parseEther("0.01"))
    const game = await ethers.getContractAt("Polygons", createdAddress(factory, await createTx.wait()))
    await expect(
      game.connect(player).buyTicket({ value: ethers.parseEther("0.02") })
    ).to.be.revertedWith("Wrong price")
    const bought = await game.connect(player).buyTicket({ value: ethers.parseEther("0.01") })
    const boughtReceipt = await bought.wait()
    expect(parseTicket(game, boughtReceipt).length).to.equal(1)
    const live = await game.connect(player).getTable()
    expect(live.prize).to.equal(ethers.parseEther("0.02"))
  })

  it("splits the ticket pot when greens fill", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    const price = ethers.parseEther("0.01")
    const createTx = await createPolygons(factory, creator, 3, price)
    const game = await ethers.getContractAt("Polygons", createdAddress(factory, await createTx.wait()))
    let used = 0n
    let settled
    for (let i = 0; i < 80; i++) {
      const tx = await game.connect(player).buyTicket({ value: price })
      const receipt = await tx.wait()
      used += 1n
      settled = parseSettled(game, receipt)
      if (settled) break
    }
    expect(settled).to.not.equal(undefined)
    const live = await game.connect(creator).getTable()
    expect(live.claimedCount).to.equal(0n)
    expect(live.prize).to.equal(0n)
    expect(live.owners.filter((owner) => owner !== ethers.ZeroAddress).length).to.equal(0)
    if (settled.args.playersWin) {
      const matched = price * used * 2n
      expect(settled.args.owners.length).to.equal(3)
      expect(settled.args.prize).to.equal(matched - (matched % 3n))
      const held = await game.connect(player).getTable()
      expect(held.claimedCount).to.equal(3n)
      expect(held.prize).to.equal(settled.args.prize)
      expect(held.myPrize).to.equal(settled.args.prize)
      await expect(
        game.connect(player).buyTicket({ value: price })
      ).to.be.revertedWith("Claim first")
      await (await game.connect(player).withdrawPrize()).wait()
    } else {
      expect(settled.args.owners.length).to.equal(0)
      expect(settled.args.prize).to.equal(0n)
      const held = await game.connect(player).getTable()
      expect(held.myPrize).to.equal(0n)
      expect(live.totalBalance).to.equal(DEPOSIT + price * used)
    }
  })

  it("assigns a cell once, then settles house or players", async () => {
    const [creator, player, other] = await ethers.getSigners()
    const factory = await deployFactory()
    const price = ethers.parseEther("0.01")
    const createTx = await createPolygons(factory, creator, 4, price)
    const game = await ethers.getContractAt("Polygons", createdAddress(factory, await createTx.wait()))
    const buyers = [player, other]
    const firstOwners = {}
    let assigned = 0
    let settled

    for (let i = 0; i < 120; i++) {
      const buyer = buyers[i % 2]
      const tx = await game.connect(buyer).buyTicket({ value: price })
      const receipt = await tx.wait()
      const tickets = parseTicket(game, receipt)
      expect(tickets.length).to.equal(1)
      const ticket = tickets[0]
      if (ticket.assigned) {
        const polygonId = Number(ticket.polygonId)
        if (!ticket.split) {
          expect(firstOwners[polygonId]).to.equal(undefined)
          firstOwners[polygonId] = ticket.player
          assigned += 1
        }
      }
      settled = parseSettled(game, receipt)
      if (settled) break
    }

    expect(settled).to.not.equal(undefined)
    const live = await game.connect(creator).getTable()
    expect(live.claimedCount).to.equal(0n)
    expect(live.prize).to.equal(0n)
    expect(live.owners.filter((owner) => owner !== ethers.ZeroAddress).length).to.equal(0)
    if (settled.args.playersWin) {
      expect(settled.args.prize).to.be.greaterThan(0n)
      expect(assigned).to.be.gte(4)
      expect(settled.args.owners.length).to.equal(4)
      const winners = {}
      let paidTotal = 0n
      const payees = [...settled.args.owners, ...(settled.args.mates || [])]
      for (const owner of payees) {
        if (!owner || owner === ethers.ZeroAddress) continue
        if (winners[owner]) continue
        winners[owner] = true
        let signer = other
        if (ethers.getAddress(owner) === ethers.getAddress(player.address)) signer = player
        const before = await game.connect(signer).getTable()
        expect(before.myPrize).to.be.greaterThan(0n)
        expect(before.claimedCount).to.equal(4n)
        const paidTx = await game.connect(signer).withdrawPrize()
        const paid = parsePaid(game, await paidTx.wait())
        expect(paid.length).to.equal(1)
        paidTotal += paid[0].amount
      }
      expect(paidTotal).to.equal(settled.args.prize)
    } else {
      expect(settled.args.prize).to.equal(0n)
      expect(assigned).to.be.gte(3)
      expect(settled.args.owners.length).to.equal(0)
    }
  })

  it("keeps each winner on their own round if another round settles first", async () => {
    const [creator, player, other] = await ethers.getSigners()
    const factory = await deployFactory()
    const price = ethers.parseEther("0.01")
    const createTx = await createPolygons(factory, creator, 3, price)
    const game = await ethers.getContractAt("Polygons", createdAddress(factory, await createTx.wait()))
    const first = await playUntilSettled(game, player, price, true)
    const firstPrize = first.settled.args.prize
    const firstOwners = first.settled.args.owners
    const heldFirst = await game.connect(player).getTable()
    expect(heldFirst.claimedCount).to.equal(3n)
    expect(heldFirst.prize).to.equal(firstPrize)
    expect(heldFirst.owners.slice(0, 3)).to.deep.equal(firstOwners)

    const second = await playUntilSettled(game, other, price, true)
    const secondPrize = second.settled.args.prize
    const secondOwners = second.settled.args.owners
    const stillFirst = await game.connect(player).getTable()
    expect(stillFirst.claimedCount).to.equal(3n)
    expect(stillFirst.prize).to.equal(firstPrize)
    expect(stillFirst.myPrize).to.equal(firstPrize)
    expect(stillFirst.owners.slice(0, 3)).to.deep.equal(firstOwners)
    const heldSecond = await game.connect(other).getTable()
    expect(heldSecond.claimedCount).to.equal(3n)
    expect(heldSecond.prize).to.equal(secondPrize)
    expect(heldSecond.owners.slice(0, 3)).to.deep.equal(secondOwners)
    const live = await game.connect(creator).getTable()
    expect(live.claimedCount).to.equal(0n)
    expect(live.prize).to.equal(0n)
    expect(live.owners.filter((owner) => owner !== ethers.ZeroAddress).length).to.equal(0)

    await (await game.connect(player).withdrawPrize()).wait()
    const afterFirst = await game.connect(player).getTable()
    expect(afterFirst.myPrize).to.equal(0n)
    const stillSecond = await game.connect(other).getTable()
    expect(stillSecond.owners.slice(0, 3)).to.deep.equal(secondOwners)
    expect(stillSecond.prize).to.equal(secondPrize)
  })

  it("treats a duplicate own green as taken", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    const price = ethers.parseEther("0.01")
    const createTx = await createPolygons(factory, creator, 4, price)
    const game = await ethers.getContractAt("Polygons", createdAddress(factory, await createTx.wait()))
    let taken
    let settled
    for (let i = 0; i < 80; i++) {
      const table = await game.connect(player).getTable()
      if (table.myPrize > 0n) break
      const tx = await game.connect(player).buyTicket({ value: price })
      const receipt = await tx.wait()
      const tickets = parseTicket(game, receipt)
      const miss = tickets.find((ticket) => !ticket.assigned && !ticket.split)
      if (miss) taken = miss
      settled = parseSettled(game, receipt)
      if (settled) break
    }
    if (taken) {
      expect(taken.assigned).to.equal(false)
      expect(taken.split).to.equal(false)
    }
    if (settled && settled.args.playersWin) {
      expect(settled.args.prize).to.be.greaterThan(0n)
      const held = await game.connect(player).getTable()
      expect(held.myPrize).to.equal(settled.args.prize)
    }
  })

  it("splits a foreign green", async () => {
    const [creator, player, other] = await ethers.getSigners()
    const factory = await deployFactory()
    const price = ethers.parseEther("0.01")
    const createTx = await createPolygons(factory, creator, 6, price)
    const game = await ethers.getContractAt("Polygons", createdAddress(factory, await createTx.wait()))
    let split
    for (let i = 0; i < 120; i++) {
      const buyer = i % 2 === 0 ? player : other
      const table = await game.connect(buyer).getTable()
      if (table.myPrize > 0n) {
        await (await game.connect(buyer).withdrawPrize()).wait()
      }
      const tx = await game.connect(buyer).buyTicket({ value: price })
      const receipt = await tx.wait()
      const tickets = parseTicket(game, receipt)
      const hit = tickets.find((ticket) => ticket.split)
      if (hit) {
        split = hit
        break
      }
    }
    expect(split).to.not.equal(undefined)
    expect(split.assigned).to.equal(true)
    expect(split.won).to.equal(true)
    const cellId = Number(split.polygonId)
    const hitter = split.player
    const table = await game.connect(player).getTable()
    expect(table.mates[cellId]).to.equal(ethers.getAddress(hitter))
    expect(table.owners[cellId]).to.not.equal(ethers.ZeroAddress)
    expect(table.owners[cellId]).to.not.equal(table.mates[cellId])
  })

  it("lets the house deposit and withdraw shares", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    const createTx = await createPolygons(factory, creator, 6, ethers.parseEther("0.01"))
    const game = await ethers.getContractAt("Polygons", createdAddress(factory, await createTx.wait()))
    await (await game.connect(player).depositShares({ value: ethers.parseEther("2") })).wait()
    const afterDeposit = await game.connect(player).getTable()
    expect(afterDeposit.memberShares).to.equal(ethers.parseEther("2"))
    expect(afterDeposit.totalBalance).to.equal(ethers.parseEther("3"))
    expect(afterDeposit.owner).to.equal(creator.address)
    await (await game.connect(player).withdrawShares(ethers.parseEther("2"))).wait()
    const afterWithdraw = await game.connect(creator).getTable()
    expect(afterWithdraw.totalBalance).to.equal(DEPOSIT)
    expect(afterWithdraw.owner).to.equal(creator.address)
  })
})

describe("session wallet acts as principal", () => {
  const createdAddress = (factory, receipt) => {
    const created = receipt.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === "GameCreated")
    return created.args.game
  }

  it("authorizes a session that plays and funds in the owner's name", async () => {
    const [creator, player] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory("GameFactory")
    const factory = await Factory.deploy()
    await factory.waitForDeployment()
    const session = ethers.Wallet.createRandom().connect(ethers.provider)
    const deposit = ethers.parseEther("5")
    await (await factory.connect(player).authorizeSession(session.address, { value: deposit })).wait()
    expect(await factory.sessionOf(player.address)).to.equal(session.address)
    expect(await factory.principalOf(session.address)).to.equal(player.address)
    expect(await factory.principalOf(player.address)).to.equal(player.address)
    expect(await ethers.provider.getBalance(session.address)).to.equal(deposit)

    const createTx = await factory.connect(creator).createGame(
      TABLE_TYPE_IDS.Roulette,
      ethers.parseEther("0.01"),
      ethers.parseEther("1"),
      0,
      { value: ethers.parseEther("100") }
    )
    const roulette = await ethers.getContractAt("Roulette", createdAddress(factory, await createTx.wait()))
    await (await roulette.connect(session).depositShares({ value: ethers.parseEther("2") })).wait()
    const asPlayer = await roulette.connect(player).getTable()
    const asSession = await roulette.connect(session).getTable()
    expect(asPlayer.memberShares).to.equal(ethers.parseEther("2"))
    expect(asSession.memberShares).to.equal(ethers.parseEther("2"))

    const playerBefore = await ethers.provider.getBalance(player.address)
    const bets = Array(157).fill(0n)
    bets[0] = ethers.parseEther("1")
    await (await roulette.connect(session).postBet(bets, { value: ethers.parseEther("1") })).wait()
    expect(await ethers.provider.getBalance(player.address)).to.equal(playerBefore)

    const next = ethers.Wallet.createRandom()
    await (await factory.connect(player).authorizeSession(next.address)).wait()
    expect(await factory.principalOf(session.address)).to.equal(session.address)
    expect(await factory.principalOf(next.address)).to.equal(player.address)
    await expect(
      factory.connect(creator).authorizeSession(next.address)
    ).to.be.revertedWith("Session taken")
  })

  it("creates games and polygons cells as the authorizing account", async () => {
    const [player] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory("GameFactory")
    const factory = await Factory.deploy()
    await factory.waitForDeployment()
    const session = ethers.Wallet.createRandom().connect(ethers.provider)
    await (await factory.connect(player).authorizeSession(session.address, {
      value: ethers.parseEther("10")
    })).wait()

    await factory.connect(session).createGame(
      TABLE_TYPE_IDS.Roulette,
      ethers.parseEther("0.01"),
      ethers.parseEther("1"),
      0,
      { value: ethers.parseEther("2") }
    )
    const rows = await factory.getGamesByCreator(player.address)
    expect(rows.length).to.equal(1)
    expect(rows[0].createdBy).to.equal(player.address)

    const polygonsTx = await factory.connect(session).createGame(
      TABLE_TYPE_IDS.Polygons,
      6,
      0,
      ethers.parseEther("0.01"),
      { value: ethers.parseEther("2") }
    )
    const polygons = await ethers.getContractAt("Polygons", createdAddress(factory, await polygonsTx.wait()))
    const price = ethers.parseEther("0.01")
    let assigned
    for (let i = 0; i < 40; i++) {
      const table = await polygons.connect(session).getTable()
      if (table.myPrize > 0n) {
        await (await polygons.connect(session).withdrawPrize()).wait()
      }
      const tx = await polygons.connect(session).buyTicket({ value: price })
      const tickets = (await tx.wait()).logs
        .map((log) => {
          try {
            return polygons.interface.parseLog(log)
          } catch {
            return null
          }
        })
        .filter((parsed) => parsed && parsed.name === "TicketBought")
      assigned = tickets.find((ticket) => ticket.args.assigned)
      if (assigned) break
    }
    expect(assigned).to.not.equal(undefined)
    expect(assigned.args.player).to.equal(player.address)
    const cellId = Number(assigned.args.polygonId)
    if (assigned.args.won) {
      expect(await polygons.cellOwner(cellId)).to.equal(player.address)
    }
    expect((await factory.getGamesByCreator(player.address)).length).to.equal(2)
  })
})

describe("UI flow: create, view, play blackjack", () => {
  const DEPOSIT = ethers.parseEther("100")
  const MIN_BET = ethers.parseEther("0.01")
  const MAX_BET = ethers.parseEther("1")
  const BET = ethers.parseEther("0.05")

  const deployFactory = async () => {
    const Factory = await ethers.getContractFactory("GameFactory")
    const factory = await Factory.deploy()
    await factory.waitForDeployment()
    return factory
  }

  const createdAddress = (factory, receipt) => {
    const created = receipt.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === "GameCreated")
    return created.args.game
  }

  const createBlackjack = (factory, creator) => {
    return factory.connect(creator).createGame(
      TABLE_TYPE_IDS.Blackjack,
      MIN_BET,
      MAX_BET,
      0,
      { value: DEPOSIT }
    )
  }

  const parseEvent = (game, receipt, name) => {
    return receipt.logs
      .map((log) => {
        try {
          return game.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === name)
  }

  const parsePaid = (game, receipt) => {
    return receipt.logs
      .map((log) => {
        try {
          return game.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .filter((parsed) => parsed && parsed.name === "Paid")
      .map((parsed) => parsed.args)
  }

  const takeCards = (hand) => {
    const count = Number(hand.count)
    return hand.cards.slice(0, count).map(Number)
  }

  const rankOf = (card) => Number(card) % 13

  const isTenOrFace = (card) => {
    const rank = rankOf(card)
    return rank === 9 || rank === 10 || rank === 11 || rank === 12
  }

  const canSplitCards = (a, b) => {
    if (rankOf(a) === rankOf(b)) return true
    return isTenOrFace(a) && isTenOrFace(b)
  }

  const isMixedTens = (a, b) => {
    return isTenOrFace(a) && isTenOrFace(b) && rankOf(a) !== rankOf(b)
  }

  const handValue = (cards) => {
    let total = 0
    let aces = 0
    for (const card of cards) {
      const rank = rankOf(card)
      if (rank === 0) {
        aces += 1
        total += 11
      } else if (rank >= 9) {
        total += 10
      } else {
        total += rank + 1
      }
    }
    while (total > 21 && aces > 0) {
      total -= 10
      aces -= 1
    }
    return total
  }

  const expectedPayout = (hand, dealerCards) => {
    const cards = takeCards(hand)
    const bet = hand.bet
    const dealerTotal = handValue(dealerCards)
    const dealerBj = dealerCards.length === 2 && dealerTotal === 21
    const dealerBust = dealerTotal > 21
    let pay = 0n
    if (bet === 0n || Number(hand.status) === 3) return pay
    const playerBj = Number(hand.status) === 4
    if (dealerBj) {
      if (playerBj) return pay + bet
      return pay
    }
    if (playerBj) return pay + bet + (bet * 3n) / 2n
    const pt = handValue(cards)
    if (dealerBust || pt > dealerTotal) return pay + bet * 2n
    if (pt === dealerTotal) return pay + bet
    return pay
  }

  const emptyBets = () => [0n, 0n, 0n]

  const dealSeat = (game, player, seat, amount = BET) => {
    const bets = emptyBets()
    bets[seat] = amount
    return game.connect(player).deal(bets, { value: amount })
  }

  it("creates a table, lists it, funds it, and plays a round", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    const createTx = await createBlackjack(factory, creator)
    const receipt = await createTx.wait()
    const address = createdAddress(factory, receipt)

    const rows = await factory.getGamesByCreator(creator.address)
    expect(rows.length).to.equal(1)
    const listed = toTable(rows[0])
    expect(listed.address).to.equal(ethers.getAddress(address))
    expect(listed.createdBy).to.equal(creator.address)
    expect(listed.type).to.equal(TABLE_TYPES.Blackjack)

    const game = await ethers.getContractAt("Blackjack", address)
    expect(await ethers.provider.getBalance(address)).to.equal(DEPOSIT)
    const afterCreate = await game.connect(creator).getTable()
    expect(afterCreate.memberShares).to.equal(DEPOSIT)
    expect(afterCreate.totalBalance).to.equal(DEPOSIT)
    expect(afterCreate.minBet).to.equal(MIN_BET)
    expect(afterCreate.maxBet).to.equal(MAX_BET)
    expect(afterCreate.seats.length).to.equal(3)
    expect(afterCreate.owner).to.equal(creator.address)

    await (await game.connect(creator).depositShares({ value: ethers.parseEther("2") })).wait()
    const afterTopUp = await game.connect(creator).getTable()
    expect(afterTopUp.totalBalance).to.equal(ethers.parseEther("102"))
    expect(afterTopUp.memberShares).to.equal(ethers.parseEther("102"))

    const dealtTx = await dealSeat(game, player, 2)
    const dealt = await dealtTx.wait()
    expect(parseEvent(game, dealt, "Dealt"), "Dealt event not found").to.not.equal(undefined)

    let table = await game.connect(player).getTable()
    expect(table.phase).to.equal(1n)
    expect(table.dealerCount).to.equal(1n)
    expect(table.seats[2].player).to.equal(player.address)
    expect(table.seats[2].hands[0].count).to.equal(2n)

    if (Number(table.seats[2].hands[0].status) === 1) {
      const standTx = await game.connect(player).stand()
      const standReceipt = await standTx.wait()
      const settled = parseEvent(game, standReceipt, "Settled")
      expect(settled, "Settled event not found").to.not.equal(undefined)
    }

    table = await game.connect(player).getTable()
    expect(table.phase).to.equal(0n)
    expect(Number(table.dealerCount)).to.be.greaterThan(0)
    expect(table.seats[2].player).to.equal(player.address)
    expect(Number(table.seats[2].hands[0].count)).to.be.greaterThan(0)
  })

  it("lets the house deposit and withdraw shares", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    const createTx = await createBlackjack(factory, creator)
    const game = await ethers.getContractAt("Blackjack", createdAddress(factory, await createTx.wait()))
    await (await game.connect(player).depositShares({ value: ethers.parseEther("2") })).wait()
    const afterDeposit = await game.connect(player).getTable()
    expect(afterDeposit.memberShares).to.equal(ethers.parseEther("2"))
    expect(afterDeposit.totalBalance).to.equal(ethers.parseEther("102"))
    expect(afterDeposit.owner).to.equal(creator.address)
    await (await game.connect(player).withdrawShares(ethers.parseEther("2"))).wait()
    const afterWithdraw = await game.connect(creator).getTable()
    expect(afterWithdraw.totalBalance).to.equal(DEPOSIT)
    expect(afterWithdraw.owner).to.equal(creator.address)
  })

  it("lets one player bet several spots in a single deal", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    const createTx = await createBlackjack(factory, creator)
    const game = await ethers.getContractAt("Blackjack", createdAddress(factory, await createTx.wait()))
    const bets = emptyBets()
    bets[0] = BET
    bets[2] = BET
    await (await game.connect(player).deal(bets, { value: BET * 2n })).wait()
    const table = await game.connect(player).getTable()
    expect(table.seats[0].player).to.equal(player.address)
    expect(table.seats[2].player).to.equal(player.address)
    expect(table.seats[0].hands[0].bet).to.equal(BET)
    expect(table.seats[2].hands[0].bet).to.equal(BET)
    expect(table.seats[1].player).to.equal(ethers.ZeroAddress)
    if (Number(table.phase) === 1) {
      while (Number((await game.connect(player).getTable()).phase) === 1) {
        await (await game.connect(player).stand()).wait()
      }
    }
  })

  it("rejects bets outside table limits", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    const createTx = await factory.connect(creator).createGame(
      TABLE_TYPE_IDS.Blackjack,
      MIN_BET,
      MIN_BET,
      0,
      { value: ethers.parseEther("1") }
    )
    const game = await ethers.getContractAt("Blackjack", createdAddress(factory, await createTx.wait()))
    const below = emptyBets()
    below[0] = ethers.parseEther("0.001")
    await expect(
      game.connect(player).deal(below, { value: ethers.parseEther("0.001") })
    ).to.be.revertedWith("Bet amount must be at least minBet")
    const above = emptyBets()
    above[0] = ethers.parseEther("0.02")
    await expect(
      game.connect(player).deal(above, { value: ethers.parseEther("0.02") })
    ).to.be.revertedWith("Bet amount must be less than maxBetAmount")
  })

  it("pays a finished hand from the dealer total", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    const createTx = await createBlackjack(factory, creator)
    const game = await ethers.getContractAt("Blackjack", createdAddress(factory, await createTx.wait()))
    let paid
    let table
    for (let i = 0; i < 40; i++) {
      const dealReceipt = await (await dealSeat(game, player, 1)).wait()
      table = await game.connect(player).getTable()
      let receipt = dealReceipt
      if (Number(table.phase) === 1) {
        while (Number(table.seats[1].hands[0].status) === 1) {
          receipt = await (await game.connect(player).stand()).wait()
          table = await game.connect(player).getTable()
        }
      }
      const settled = parseEvent(game, receipt, "Settled")
      if (!settled) continue
      paid = parsePaid(game, receipt)[0]
      const dealerCount = Number(settled.args.dealerCount)
      const dealerCards = settled.args.dealerCards.slice(0, dealerCount).map(Number)
      const hand = {
        bet: BET,
        status: table.seats[1].hands[0].status,
        count: 2,
        cards: takeCards((await game.queryFilter(game.filters.Dealt()))[0] ? table.seats[1].hands[0] : table.seats[1].hands[0])
      }
      expect(paid.wagered).to.equal(BET)
      expect(paid.player).to.equal(player.address)
      expect(Number(settled.args.dealerTotal)).to.equal(handValue(dealerCards))
      break
    }
    expect(paid, "Paid event not found").to.not.equal(undefined)
  })

  it("doubles a two-card hand and splits a pair", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    const createTx = await createBlackjack(factory, creator)
    const game = await ethers.getContractAt("Blackjack", createdAddress(factory, await createTx.wait()))
    let doubled
    let split
    for (let i = 0; i < 80; i++) {
      await (await dealSeat(game, player, 0)).wait()
      const table = await game.connect(player).getTable()
      const hand = table.seats[0].hands[0]
      const cards = takeCards(hand)
      const playing = Number(hand.status) === 1
      if (playing && !split && canSplitCards(cards[0], cards[1])) {
        const receipt = await (await game.connect(player).split({ value: BET })).wait()
        split = parseEvent(game, receipt, "Acted")
        let next = await game.connect(player).getTable()
        while (Number(next.phase) === 1 && next.seats[0].player === player.address) {
          const live = Number(next.seats[0].hands[Number(next.currentHand)].status) === 1
          if (!live) break
          await (await game.connect(player).stand()).wait()
          next = await game.connect(player).getTable()
        }
        continue
      }
      if (playing && !doubled && cards.length === 2) {
        const receipt = await (await game.connect(player).doubleDown({ value: BET })).wait()
        doubled = parseEvent(game, receipt, "Acted")
        continue
      }
      if (playing) {
        await (await game.connect(player).stand()).wait()
      }
      if (doubled && split) break
    }
    expect(doubled, "double not found").to.not.equal(undefined)
    expect(Number(doubled.args.kind)).to.equal(2)
    expect(split, "split not found").to.not.equal(undefined)
    expect(Number(split.args.kind)).to.equal(3)
  })

  it("resplits a pair and doubles after a split", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    const createTx = await createBlackjack(factory, creator)
    const game = await ethers.getContractAt("Blackjack", createdAddress(factory, await createTx.wait()))
    let splits = 0
    let doubled
    for (let i = 0; i < 200; i++) {
      await (await dealSeat(game, player, 0)).wait()
      let table = await game.connect(player).getTable()
      while (Number(table.phase) === 1 && table.seats[0].player === player.address) {
        const handIndex = Number(table.currentHand)
        const hand = table.seats[0].hands[handIndex]
        const cards = takeCards(hand)
        const playing = Number(hand.status) === 1
        if (!playing) break
        const open = table.seats[0].hands.some((row) => Number(row.status) === 0)
        if (open && cards.length === 2 && canSplitCards(cards[0], cards[1]) && splits < 3) {
          await (await game.connect(player).split({ value: hand.bet })).wait()
          splits += 1
          table = await game.connect(player).getTable()
          continue
        }
        if (!doubled && splits > 0 && cards.length === 2) {
          const receipt = await (await game.connect(player).doubleDown({ value: hand.bet })).wait()
          doubled = parseEvent(game, receipt, "Acted")
          table = await game.connect(player).getTable()
          continue
        }
        await (await game.connect(player).stand()).wait()
        table = await game.connect(player).getTable()
      }
      if (splits >= 2 && doubled) break
    }
    expect(splits).to.be.at.least(2)
    expect(doubled, "double after split not found").to.not.equal(undefined)
    expect(Number(doubled.args.kind)).to.equal(2)
  })

  it("splits mixed tens and picture cards", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    const createTx = await createBlackjack(factory, creator)
    const game = await ethers.getContractAt("Blackjack", createdAddress(factory, await createTx.wait()))
    let split
    let ranks
    for (let i = 0; i < 120; i++) {
      await (await dealSeat(game, player, 2)).wait()
      const table = await game.connect(player).getTable()
      const hand = table.seats[2].hands[0]
      const cards = takeCards(hand)
      const playing = Number(hand.status) === 1
      if (playing && isMixedTens(cards[0], cards[1])) {
        const receipt = await (await game.connect(player).split({ value: BET })).wait()
        split = parseEvent(game, receipt, "Acted")
        ranks = [rankOf(cards[0]), rankOf(cards[1])]
        let next = await game.connect(player).getTable()
        while (Number(next.phase) === 1 && next.seats[2].player === player.address) {
          const live = Number(next.seats[2].hands[Number(next.currentHand)].status) === 1
          if (!live) break
          await (await game.connect(player).stand()).wait()
          next = await game.connect(player).getTable()
        }
        break
      }
      if (playing) await (await game.connect(player).stand()).wait()
    }
    expect(split, "mixed tens split not found").to.not.equal(undefined)
    expect(Number(split.args.kind)).to.equal(3)
    expect(ranks[0]).to.not.equal(ranks[1])
    expect(isTenOrFace(ranks[0])).to.equal(true)
    expect(isTenOrFace(ranks[1])).to.equal(true)
  })

  it("pays 3:2 on a natural blackjack when the dealer does not have one", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    const createTx = await createBlackjack(factory, creator)
    const game = await ethers.getContractAt("Blackjack", createdAddress(factory, await createTx.wait()))
    let hit
    for (let i = 0; i < 120; i++) {
      const receipt = await (await dealSeat(game, player, 2)).wait()
      let used = receipt
      let table = await game.connect(player).getTable()
      if (Number(table.phase) === 1 && Number(table.seats[2].hands[0].status) === 1) {
        used = await (await game.connect(player).stand()).wait()
        table = await game.connect(player).getTable()
      }
      const settled = parseEvent(game, used, "Settled")
      if (!settled) continue
      const paid = parsePaid(game, used)[0]
      const dealerCount = Number(settled.args.dealerCount)
      const dealerCards = settled.args.dealerCards.slice(0, dealerCount).map(Number)
      const dealerBj = dealerCards.length === 2 && handValue(dealerCards) === 21
      if (paid.payout === BET + (BET * 3n) / 2n && !dealerBj) {
        hit = paid
        break
      }
    }
    expect(hit, "blackjack payout not found").to.not.equal(undefined)
    expect(hit.wagered).to.equal(BET)
  })
})

