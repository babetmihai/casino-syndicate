const { expect } = require("chai")
const { ethers } = require("hardhat")

const TABLE_TYPES = { Roulette: "Roulette" }
const TABLE_TYPE_IDS = { [TABLE_TYPES.Roulette]: 0 }
const TABLE_TYPE_BY_ID = { 0: TABLE_TYPES.Roulette }

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
