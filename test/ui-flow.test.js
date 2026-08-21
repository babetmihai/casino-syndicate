const { expect } = require("chai")
const { ethers } = require("hardhat")

const TABLE_TYPES = { Roulette: "Roulette", Polygons: "Polygons" }
const TABLE_TYPE_IDS = { [TABLE_TYPES.Roulette]: 0, [TABLE_TYPES.Polygons]: 1 }
const TABLE_TYPE_BY_ID = { 0: TABLE_TYPES.Roulette, 1: TABLE_TYPES.Polygons }

const toTable = ({ game, name, createdBy, createdAt, gameType }) => {
  const address = ethers.getAddress(game)
  return {
    address,
    name,
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
      "Test Table",
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
    expect(listed.name).to.equal("Test Table")
    expect(listed.createdBy).to.equal(creator.address)
    expect(listed.type).to.equal(TABLE_TYPES.Roulette)

    const loaded = toTable(await factory.getGame(createdAddress))
    expect(loaded).to.deep.include({
      address: listed.address,
      name: "Test Table",
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
      "Bankroll Table",
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
      "Outside Table",
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
      "Inside Table",
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
    const [creator, player] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory("GameFactory")
    const factory = await Factory.deploy()
    await factory.waitForDeployment()
    const createTx = await factory.connect(creator).createGame(
      "Limits Table",
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

    await (await roulette.connect(creator).setLimits(
      ethers.parseEther("0.01"),
      ethers.parseEther("1")
    )).wait()
    const afterSet = await roulette.connect(creator).getTable()
    expect(afterSet.minBet).to.equal(ethers.parseEther("0.01"))
    expect(afterSet.maxBet).to.equal(ethers.parseEther("1"))

    await expect(
      roulette.connect(player).setLimits(ethers.parseEther("0.01"), ethers.parseEther("1"))
    ).to.be.revertedWith("Only owner")

    await expect(
      roulette.connect(creator).setLimits(ethers.parseEther("0.05"), ethers.parseEther("0.01"))
    ).to.be.revertedWith("Max below min")

    await expect(
      factory.connect(creator).createGame(
        "Bad Max",
        TABLE_TYPE_IDS.Roulette,
        ethers.parseEther("0.05"),
        ethers.parseEther("0.01"),
        0,
        { value: ethers.parseEther("1") }
      )
    ).to.be.revertedWith("Max below min")

    await (await factory.connect(creator).setGameName(created.args.game, "Night Table")).wait()
    expect((await factory.getGame(created.args.game)).name).to.equal("Night Table")
    expect(await roulette.name()).to.equal("Night Table")

    await expect(
      factory.connect(player).setGameName(created.args.game, "Stolen")
    ).to.be.revertedWith("Only owner")
  })

  it("rejects bets outside table limits", async () => {
    const [creator, player] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory("GameFactory")
    const factory = await Factory.deploy()
    await factory.waitForDeployment()
    const createTx = await factory.connect(creator).createGame(
      "Cover Table",
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
        "Thin Table",
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
      "Bank Table",
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

  it("transfers ownership to the largest shareholder on deposit and withdraw", async () => {
    const [creator, player] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory("GameFactory")
    const factory = await Factory.deploy()
    await factory.waitForDeployment()
    const createTx = await factory.connect(creator).createGame(
      "Share Table",
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
    expect(await roulette.createdBy()).to.equal(player.address)
    expect((await factory.getGame(game)).createdBy).to.equal(player.address)
    expect((await factory.getGamesByCreator(player.address)).length).to.equal(1)
    expect((await factory.getGamesByCreator(creator.address)).length).to.equal(0)
    expect((await roulette.connect(player).getTable()).owner).to.equal(player.address)

    await (await roulette.connect(player).setLimits(
      ethers.parseEther("0.01"),
      ethers.parseEther("0.1")
    )).wait()
    await expect(
      roulette.connect(creator).setLimits(ethers.parseEther("0.01"), ethers.parseEther("0.1"))
    ).to.be.revertedWith("Only owner")
    await expect(
      factory.connect(creator).setGameName(game, "Stolen")
    ).to.be.revertedWith("Only owner")
    await (await factory.connect(player).setGameName(game, "House Table")).wait()
    expect(await roulette.name()).to.equal("House Table")

    await (await roulette.connect(creator).depositShares({ value: ethers.parseEther("3") })).wait()
    expect(await roulette.createdBy()).to.equal(creator.address)
    expect((await factory.getGamesByCreator(creator.address)).length).to.equal(1)
    expect((await factory.getGamesByCreator(player.address)).length).to.equal(0)

    await (await roulette.connect(creator).withdrawShares(ethers.parseEther("3.5"))).wait()
    expect(await roulette.createdBy()).to.equal(player.address)
    expect((await factory.getGame(game)).createdBy).to.equal(player.address)
    expect((await factory.getGamesByCreator(player.address)).length).to.equal(1)
    expect((await factory.getGamesByCreator(creator.address)).length).to.equal(0)
  })
})

describe("UI flow: create, view, play lottery", () => {
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

  const createLottery = (factory, creator, name, polygons, price) => {
    return factory.connect(creator).createGame(
      name,
      TABLE_TYPE_IDS.Polygons,
      polygons,
      0,
      price,
      { value: DEPOSIT }
    )
  }

  const freshQuote = (price, polygons) => {
    const lose = BigInt(polygons - 1)
    return price * lose * 4n * BigInt(polygons)
  }

  const fillPrizeFrom = (price, pluses, mates = [], matePluses = []) => {
    let heat = 0n
    for (const plus of pluses) heat += 4n + plus
    for (let i = 0; i < pluses.length; i++) {
      const mate = mates[i]
      if (!mate || mate === ethers.ZeroAddress) continue
      heat += 4n + BigInt(matePluses[i] || 0)
    }
    return { heat }
  }

  const parseTicket = (lottery, receipt) => {
    return receipt.logs
      .map((log) => {
        try {
          return lottery.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .filter((parsed) => parsed && parsed.name === "TicketBought")
      .map((parsed) => parsed.args)
  }

  const parsePaid = (lottery, receipt) => {
    return receipt.logs
      .map((log) => {
        try {
          return lottery.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .filter((parsed) => parsed && parsed.name === "PrizePaid")
      .map((parsed) => parsed.args)
  }

  const parseSettled = (lottery, receipt) => {
    return receipt.logs
      .map((log) => {
        try {
          return lottery.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === "Settled")
  }

  const parseRefund = (lottery, receipt) => {
    return receipt.logs
      .map((log) => {
        try {
          return lottery.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((parsed) => parsed && parsed.name === "TicketsRefunded")
  }

  const playUntilSettled = async (lottery, signer, price, wantPlayers) => {
    for (let i = 0; i < 40; i++) {
      const table = await lottery.connect(signer).getTable()
      if (table.myPrize > 0n) {
        await (await lottery.connect(signer).withdrawPrize()).wait()
      }
      const tx = await lottery.connect(signer).buyTickets(10, { value: price * 10n })
      const receipt = await tx.wait()
      const settled = parseSettled(lottery, receipt)
      if (!settled) continue
      if (wantPlayers === undefined) return { settled, receipt }
      if (settled.args.playersWin === wantPlayers) return { settled, receipt }
    }
    throw new Error("round did not settle")
  }

  it("creates a lottery, lists it, and loads polygon config", async () => {
    const [creator] = await ethers.getSigners()
    const factory = await deployFactory()
    const createTx = await createLottery(factory, creator, "Night Map", 12, ethers.parseEther("0.05"))
    const receipt = await createTx.wait()
    const address = createdAddress(factory, receipt)

    const rows = await factory.getGamesByCreator(creator.address)
    expect(rows.length).to.equal(1)
    const listed = toTable(rows[0])
    expect(listed.address).to.equal(ethers.getAddress(address))
    expect(listed.name).to.equal("Night Map")
    expect(listed.type).to.equal(TABLE_TYPES.Polygons)

    const lottery = await ethers.getContractAt("Lottery", address)
    const table = await lottery.connect(creator).getTable()
    expect(table.polygonCount).to.equal(12n)
    expect(table.loseCount).to.equal(11n)
    expect(table.ticketPrice).to.equal(ethers.parseEther("0.05"))
    expect(table.claimedCount).to.equal(0n)
    expect(table.prize).to.equal(freshQuote(ethers.parseEther("0.05"), 12))
    expect(table.plusBits).to.equal(0n)
    expect(table.totalBalance).to.equal(DEPOSIT)
    expect(table.memberShares).to.equal(DEPOSIT)
    expect(table.owners.length).to.equal(23)
  })

  it("rejects bad lottery params and wrong ticket price", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    await expect(
      factory.connect(creator).createGame(
        "Few",
        TABLE_TYPE_IDS.Polygons,
        2,
        0,
        ethers.parseEther("0.01"),
        { value: DEPOSIT }
      )
    ).to.be.revertedWith("Bad polygons")
    await expect(
      factory.connect(creator).createGame(
        "Huge",
        TABLE_TYPE_IDS.Polygons,
        49,
        0,
        ethers.parseEther("0.01"),
        { value: DEPOSIT }
      )
    ).to.be.revertedWith("Bad polygons")
    await expect(
      factory.connect(creator).createGame(
        "Cheap",
        TABLE_TYPE_IDS.Polygons,
        12,
        0,
        ethers.parseEther("0.001"),
        { value: DEPOSIT }
      )
    ).to.be.revertedWith("Price too small")
    await expect(
      factory.connect(creator).createGame(
        "Broke",
        TABLE_TYPE_IDS.Polygons,
        12,
        0,
        ethers.parseEther("0.01")
      )
    ).to.be.revertedWith("Min deposit 1")

    const createTx = await createLottery(factory, creator, "Ticket Map", 4, ethers.parseEther("0.01"))
    const lottery = await ethers.getContractAt("Lottery", createdAddress(factory, await createTx.wait()))
    await expect(
      lottery.connect(player).buyTicket({ value: ethers.parseEther("0.02") })
    ).to.be.revertedWith("Wrong price")
    await expect(
      lottery.connect(player).buyTickets(3, { value: ethers.parseEther("0.03") })
    ).to.be.revertedWith("Bad count")
    await expect(
      lottery.connect(player).buyTickets(5, { value: ethers.parseEther("0.01") })
    ).to.be.revertedWith("Wrong price")
    const multi = await lottery.connect(player).buyTickets(5, { value: ethers.parseEther("0.05") })
    const multiReceipt = await multi.wait()
    expect(parseTicket(lottery, multiReceipt).length).to.be.lte(5)
  })

  it("refunds leftover tickets when a side fills mid-batch", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    const price = ethers.parseEther("0.01")
    const createTx = await createLottery(factory, creator, "Refund Map", 3, price)
    const lottery = await ethers.getContractAt("Lottery", createdAddress(factory, await createTx.wait()))
    const paid = price * 10n
    const tx = await lottery.connect(player).buyTickets(10, { value: paid })
    const receipt = await tx.wait()
    const tickets = parseTicket(lottery, receipt)
    expect(tickets.length).to.be.lte(10)
    expect(tickets.length).to.be.gte(3)
    const leftover = 10n - BigInt(tickets.length)
    const refunded = parseRefund(lottery, receipt)
    const settled = parseSettled(lottery, receipt)
    expect(settled).to.not.equal(undefined)
    if (leftover > 0n) {
      expect(refunded).to.not.equal(undefined)
      expect(refunded.args.count).to.equal(leftover)
      expect(refunded.args.amount).to.equal(price * leftover)
    }
    const used = BigInt(tickets.length)
    const live = await lottery.connect(creator).getTable()
    expect(live.claimedCount).to.equal(0n)
    expect(live.prize).to.equal(freshQuote(price, 3))
    expect(live.owners.filter((owner) => owner !== ethers.ZeroAddress).length).to.equal(0)
    if (settled.args.playersWin) {
      expect(settled.args.owners.length).to.equal(3)
      const { heat } = fillPrizeFrom(price, settled.args.pluses, settled.args.mates, settled.args.matePluses)
      expect(heat).to.be.gte(12n)
      expect(settled.args.prize % price).to.equal(0n)
      const reds = settled.args.prize / (price * heat)
      expect(reds).to.be.gte(1n)
      expect(reds).to.be.lte(2n)
      expect(settled.args.prize).to.equal(price * reds * heat)
      const held = await lottery.connect(player).getTable()
      expect(held.claimedCount).to.equal(3n)
      expect(held.prize).to.equal(settled.args.prize)
      expect(held.myPrize).to.equal(settled.args.prize)
      await expect(
        lottery.connect(player).buyTicket({ value: price })
      ).to.be.revertedWith("Claim first")
      await (await lottery.connect(player).withdrawPrize()).wait()
    } else {
      expect(settled.args.owners.length).to.equal(0)
      expect(settled.args.prize).to.equal(0n)
      const held = await lottery.connect(player).getTable()
      expect(held.myPrize).to.equal(0n)
      expect(live.totalBalance).to.equal(DEPOSIT + price * used)
    }
  })

  it("assigns a cell once, then settles house or players", async () => {
    const [creator, player, other] = await ethers.getSigners()
    const factory = await deployFactory()
    const price = ethers.parseEther("0.01")
    const createTx = await createLottery(factory, creator, "Fill Map", 4, price)
    const lottery = await ethers.getContractAt("Lottery", createdAddress(factory, await createTx.wait()))
    const buyers = [player, other]
    const firstOwners = {}
    let assigned = 0
    let settled

    for (let i = 0; i < 120; i++) {
      const buyer = buyers[i % 2]
      const tx = await lottery.connect(buyer).buyTicket({ value: price })
      const receipt = await tx.wait()
      const tickets = parseTicket(lottery, receipt)
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
      settled = parseSettled(lottery, receipt)
      if (settled) break
    }

    expect(settled).to.not.equal(undefined)
    const live = await lottery.connect(creator).getTable()
    expect(live.claimedCount).to.equal(0n)
    expect(live.prize).to.equal(freshQuote(price, 4))
    expect(live.owners.filter((owner) => owner !== ethers.ZeroAddress).length).to.equal(0)
    if (settled.args.playersWin) {
      expect(settled.args.prize).to.be.greaterThan(0n)
      expect(assigned).to.be.gte(4)
      expect(settled.args.owners.length).to.equal(4)
      const { heat } = fillPrizeFrom(price, settled.args.pluses, settled.args.mates, settled.args.matePluses)
      expect(settled.args.prize % (price * heat)).to.equal(0n)
      const winners = {}
      let paidTotal = 0n
      const payees = [...settled.args.owners, ...(settled.args.mates || [])]
      for (const owner of payees) {
        if (!owner || owner === ethers.ZeroAddress) continue
        if (winners[owner]) continue
        winners[owner] = true
        let signer = other
        if (ethers.getAddress(owner) === ethers.getAddress(player.address)) signer = player
        const before = await lottery.connect(signer).getTable()
        expect(before.myPrize).to.be.greaterThan(0n)
        expect(before.claimedCount).to.equal(4n)
        const paidTx = await lottery.connect(signer).withdrawPrize()
        const paid = parsePaid(lottery, await paidTx.wait())
        expect(paid.length).to.equal(1)
        paidTotal += paid[0].amount
      }
      expect(paidTotal).to.equal(settled.args.prize)
    } else {
      expect(settled.args.prize).to.equal(0n)
      expect(assigned).to.be.gte(3)
      expect(settled.args.owners.length).to.equal(0)
      const held = await lottery.connect(player).getTable()
      expect(held.myPrize).to.equal(0n)
    }
  })

  it("keeps each winner on their own round if another round settles first", async () => {
    const [creator, player, other] = await ethers.getSigners()
    const factory = await deployFactory()
    const price = ethers.parseEther("0.01")
    const createTx = await createLottery(factory, creator, "Stack Map", 3, price)
    const lottery = await ethers.getContractAt("Lottery", createdAddress(factory, await createTx.wait()))
    const first = await playUntilSettled(lottery, player, price, true)
    const firstPrize = first.settled.args.prize
    const firstOwners = first.settled.args.owners
    const heldFirst = await lottery.connect(player).getTable()
    expect(heldFirst.claimedCount).to.equal(3n)
    expect(heldFirst.prize).to.equal(firstPrize)
    expect(heldFirst.owners.slice(0, 3)).to.deep.equal(firstOwners)

    const second = await playUntilSettled(lottery, other, price, true)
    const secondPrize = second.settled.args.prize
    const secondOwners = second.settled.args.owners
    const stillFirst = await lottery.connect(player).getTable()
    expect(stillFirst.claimedCount).to.equal(3n)
    expect(stillFirst.prize).to.equal(firstPrize)
    expect(stillFirst.myPrize).to.equal(firstPrize)
    expect(stillFirst.owners.slice(0, 3)).to.deep.equal(firstOwners)
    const heldSecond = await lottery.connect(other).getTable()
    expect(heldSecond.claimedCount).to.equal(3n)
    expect(heldSecond.prize).to.equal(secondPrize)
    expect(heldSecond.owners.slice(0, 3)).to.deep.equal(secondOwners)
    const live = await lottery.connect(creator).getTable()
    expect(live.claimedCount).to.equal(0n)
    expect(live.prize).to.equal(freshQuote(price, 3))
    expect(live.owners.filter((owner) => owner !== ethers.ZeroAddress).length).to.equal(0)

    await (await lottery.connect(player).withdrawPrize()).wait()
    const afterFirst = await lottery.connect(player).getTable()
    expect(afterFirst.myPrize).to.equal(0n)
    const stillSecond = await lottery.connect(other).getTable()
    expect(stillSecond.owners.slice(0, 3)).to.deep.equal(secondOwners)
    expect(stillSecond.prize).to.equal(secondPrize)
  })

  it("charges plus on a duplicate own green and pays fill from reds and heat", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    const price = ethers.parseEther("0.01")
    const createTx = await createLottery(factory, creator, "Heat Map", 4, price)
    const lottery = await ethers.getContractAt("Lottery", createdAddress(factory, await createTx.wait()))
    let charged
    let settled
    for (let i = 0; i < 80; i++) {
      const table = await lottery.connect(player).getTable()
      if (table.myPrize > 0n) break
      const tx = await lottery.connect(player).buyTicket({ value: price })
      const receipt = await tx.wait()
      const tickets = parseTicket(lottery, receipt)
      const plusHit = tickets.find((ticket) => Number(ticket.plus) > 0)
      if (plusHit) charged = plusHit
      settled = parseSettled(lottery, receipt)
      if (settled) break
    }
    if (charged) {
      expect(Number(charged.plus)).to.be.gte(1)
      expect(Number(charged.plus)).to.be.lte(3)
      expect(charged.assigned).to.equal(false)
      expect(charged.won).to.equal(true)
    }
    if (settled && settled.args.playersWin) {
      const { heat } = fillPrizeFrom(price, settled.args.pluses, settled.args.mates, settled.args.matePluses)
      expect(settled.args.prize).to.equal(price * (settled.args.prize / (price * heat)) * heat)
      const held = await lottery.connect(player).getTable()
      expect(held.myPrize).to.equal(settled.args.prize)
    }
  })

  it("splits a foreign green and keeps the original pluses", async () => {
    const [creator, player, other] = await ethers.getSigners()
    const factory = await deployFactory()
    const price = ethers.parseEther("0.01")
    const createTx = await createLottery(factory, creator, "Split Map", 6, price)
    const lottery = await ethers.getContractAt("Lottery", createdAddress(factory, await createTx.wait()))
    let split
    for (let i = 0; i < 120; i++) {
      const buyer = i % 2 === 0 ? player : other
      const table = await lottery.connect(buyer).getTable()
      if (table.myPrize > 0n) {
        await (await lottery.connect(buyer).withdrawPrize()).wait()
      }
      const tx = await lottery.connect(buyer).buyTicket({ value: price })
      const receipt = await tx.wait()
      const tickets = parseTicket(lottery, receipt)
      const hit = tickets.find((ticket) => ticket.split)
      if (hit) {
        split = hit
        break
      }
    }
    expect(split).to.not.equal(undefined)
    expect(split.assigned).to.equal(true)
    expect(split.won).to.equal(true)
    expect(Number(split.plus)).to.equal(0)
    const cellId = Number(split.polygonId)
    const hitter = split.player
    const table = await lottery.connect(player).getTable()
    expect(table.mates[cellId]).to.equal(ethers.getAddress(hitter))
    expect(table.owners[cellId]).to.not.equal(ethers.ZeroAddress)
    expect(table.owners[cellId]).to.not.equal(table.mates[cellId])
    const ownerBits = Number((table.plusBits >> BigInt(cellId * 2)) & 3n)
    expect(ownerBits).to.be.lte(3)
    expect(Number((table.matePlusBits >> BigInt(cellId * 2)) & 3n)).to.equal(0)
  })

  it("lets the house deposit and withdraw shares", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    const createTx = await createLottery(factory, creator, "Bank Map", 6, ethers.parseEther("0.01"))
    const lottery = await ethers.getContractAt("Lottery", createdAddress(factory, await createTx.wait()))
    await (await lottery.connect(player).depositShares({ value: ethers.parseEther("2") })).wait()
    const afterDeposit = await lottery.connect(player).getTable()
    expect(afterDeposit.memberShares).to.equal(ethers.parseEther("2"))
    expect(afterDeposit.totalBalance).to.equal(ethers.parseEther("3"))
    expect(afterDeposit.owner).to.equal(player.address)
    await (await lottery.connect(player).withdrawShares(ethers.parseEther("2"))).wait()
    const afterWithdraw = await lottery.connect(creator).getTable()
    expect(afterWithdraw.totalBalance).to.equal(DEPOSIT)
    expect(afterWithdraw.owner).to.equal(creator.address)
  })

  it("edits only the name through the factory", async () => {
    const [creator, player] = await ethers.getSigners()
    const factory = await deployFactory()
    const createTx = await createLottery(factory, creator, "Rename Map", 6, ethers.parseEther("0.01"))
    const address = createdAddress(factory, await createTx.wait())
    const lottery = await ethers.getContractAt("Lottery", address)
    await (await factory.connect(creator).setGameName(address, "Street Map")).wait()
    expect((await factory.getGame(address)).name).to.equal("Street Map")
    expect(await lottery.name()).to.equal("Street Map")
    await expect(
      factory.connect(player).setGameName(address, "Stolen")
    ).to.be.revertedWith("Only owner")
  })
})

