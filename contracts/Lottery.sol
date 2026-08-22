// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ILotteryFactory {
	function principalOf(address account) external view returns (address);
}


contract Lottery {
	address public createdBy;
	address public factory;
	uint256 public createdAt;

	uint256 public polygonCount;
	uint256 public loseCount;
	uint256 public ticketPrice;
	uint256 public winLit;
	uint256 public loseLit;
	uint256 public bonusLocked;
	uint256 public pot;
	uint256 public reserved;

	uint256 public totalShares;
	mapping(address => uint256) public shares;
	mapping(address => uint256) public lastWithdrawAt;

	mapping(uint256 => address) public cellOwner;
	mapping(uint256 => address) private cellMate;
	mapping(uint256 => uint8) private cellBonus;
	mapping(address => uint256) public prizes;
	uint256 private settleCount;
	mapping(uint256 => address[]) private settledOwners;
	mapping(uint256 => address[]) private settledMates;
	mapping(uint256 => uint256) private settledPrize;
	mapping(uint256 => uint256) private settledBonusBits;
	mapping(uint256 => uint256) private heldCount;
	mapping(address => uint256) private heldSettle;

	uint256 public constant MIN_POLYGONS = 3;
	uint256 public constant MAX_POLYGONS = 48;
	uint256 public constant CHIP = 0.01 ether;
	uint256 public constant MIN_DEPOSIT = 1 ether;
	uint256 public constant WITHDRAW_INTERVAL = 1 days;
	uint8 public constant SPARK = 1;
	uint8 public constant NUCLEUS = 2;
	uint8 public constant NOVA = 3;

	uint256 private nonce;

	struct TableDTO {
		uint256 polygonCount;
		uint256 loseCount;
		uint256 ticketPrice;
		uint256 claimedCount;
		uint256 loseLit;
		uint256 prize;
		uint256 myPrize;
		uint256 memberShares;
		uint256 totalBalance;
		uint256 lastWithdrawAt;
		address owner;
		address[] owners;
		address[] mates;
		uint256 bonusBits;
	}

	event TicketBought(address indexed player, bool won, uint256 polygonId, bool assigned, bool split, uint8 bonus);
	event PrizePaid(address indexed player, uint256 amount);
	event Settled(uint256 prize, address[] owners, bool playersWin, address[] mates, uint256 bonusBits);
	event Deposited(address indexed user, uint256 amount);

	constructor(
		address _createdBy,
		uint256 _polygonCount,
		uint256 _ticketPrice
	) payable {
		require(msg.value >= MIN_DEPOSIT, "Min deposit 1");
		require(_polygonCount >= MIN_POLYGONS && _polygonCount <= MAX_POLYGONS, "Bad polygons");
		require(_ticketPrice >= CHIP, "Price too small");
		createdBy = _createdBy;
		factory = msg.sender;
		createdAt = block.timestamp;
		polygonCount = _polygonCount;
		loseCount = _polygonCount - 1;
		ticketPrice = _ticketPrice;
		totalShares = msg.value;
		shares[_createdBy] = msg.value;
		emit Deposited(_createdBy, msg.value);
	}

	function principal() private view returns (address) {
		return ILotteryFactory(factory).principalOf(msg.sender);
	}

	function getTable() public view returns (TableDTO memory) {
		address account = principal();
		uint256 total = polygonCount + loseCount;
		uint256 held = heldSettle[account];
		bool holding = prizes[account] > 0 && held != 0;
		address[] memory owners = new address[](total);
		address[] memory mates = new address[](polygonCount);
		uint256 shownWin = winLit;
		uint256 shownPrize = pot + bonusLocked;
		uint256 bonusBits = 0;
		for (uint256 i = 0; i < total; i++) {
			if (holding && i < polygonCount) {
				owners[i] = settledOwners[held][i];
				mates[i] = settledMates[held][i];
			} else if (!holding) {
				owners[i] = cellOwner[i];
				if (i < polygonCount) {
					mates[i] = cellMate[i];
				}
				uint8 kind = cellBonus[i];
				if (kind != 0) {
					bonusBits |= uint256(kind) << (2 * i);
				}
			}
		}
		if (holding) {
			shownWin = polygonCount;
			shownPrize = settledPrize[held];
			bonusBits = settledBonusBits[held];
		}
		uint256 bankroll = houseBankroll();
		uint256 owned = 0;
		if (totalShares > 0 && bankroll > 0) {
			owned = (bankroll * shares[account]) / totalShares;
		}
		return TableDTO({
			polygonCount: polygonCount,
			loseCount: loseCount,
			ticketPrice: ticketPrice,
			claimedCount: shownWin,
			loseLit: loseLit,
			prize: shownPrize,
			myPrize: prizes[account],
			memberShares: owned,
			totalBalance: bankroll,
			lastWithdrawAt: lastWithdrawAt[account],
			owner: createdBy,
			owners: owners,
			mates: mates,
			bonusBits: bonusBits
		});
	}

	function depositShares() public payable {
		require(msg.value > 0, "Send ETH");
		address account = principal();
		uint256 previousBalance = houseBankroll() - msg.value;
		uint256 memberShares = msg.value;
		bool ownsAll = totalShares > 0 && shares[account] == totalShares;
		if (totalShares > 0 && previousBalance > 0 && !ownsAll) {
			memberShares = (msg.value * totalShares) / previousBalance;
			require(memberShares > 0, "Share calculation resulted in zero");
		}

		totalShares += memberShares;
		shares[account] += memberShares;
		emit Deposited(account, msg.value);
	}

	function withdrawShares(uint256 amount) external {
		require(amount > 0, "Must withdraw some Ether");
		address account = principal();
		uint256 previous = lastWithdrawAt[account];
		if (previous != 0) {
			require(block.timestamp >= previous + WITHDRAW_INTERVAL, "Once per day");
		}
		uint256 memberShares = shares[account];
		require(memberShares > 0, "Must have shares to withdraw");
		uint256 bankroll = houseBankroll();
		require(bankroll > 0, "Must have shares to withdraw");
		uint256 owned = (bankroll * memberShares) / totalShares;
		require(amount <= owned, "Amount exceeds share");

		uint256 burned = memberShares;
		if (amount < owned) {
			burned = (amount * totalShares) / bankroll;
			require(burned > 0, "Share calculation resulted in zero");
			require(burned < memberShares, "Must withdraw remaining share");
		}

		totalShares -= burned;
		shares[account] -= burned;
		if (shares[account] == 0) {
			delete shares[account];
		}
		lastWithdrawAt[account] = block.timestamp;
		payable(msg.sender).transfer(amount);
	}

	function withdrawPrize() external {
		address account = principal();
		uint256 amount = prizes[account];
		require(amount > 0, "No prize");
		prizes[account] = 0;
		reserved -= amount;
		uint256 id = heldSettle[account];
		delete heldSettle[account];
		if (id != 0) {
			uint256 left = heldCount[id] - 1;
			if (left == 0) {
				delete heldCount[id];
				delete settledPrize[id];
				delete settledOwners[id];
				delete settledMates[id];
				delete settledBonusBits[id];
			} else {
				heldCount[id] = left;
			}
		}
		emit PrizePaid(account, amount);
		payable(msg.sender).transfer(amount);
	}

	function buyTicket() external payable {
		address player = principal();
		require(prizes[player] == 0, "Claim first");
		require(msg.value == ticketPrice, "Wrong price");
		pot += msg.value;
		uint8 outcome = drawTicket(player);
		if (outcome == 1) {
			settlePlayers();
		} else if (outcome == 2) {
			settleHouse();
		}
	}

	function drawTicket(address player) private returns (uint8 outcome) {
		uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, player, nonce)));
		nonce++;
		uint256 total = polygonCount + loseCount;
		uint256 cellId = seed % total;
		address owner = cellOwner[cellId];
		if (owner != address(0)) {
			bool won = cellId < polygonCount;
			if (won && cellMate[cellId] == address(0) && owner != player) {
				cellMate[cellId] = player;
				emit TicketBought(player, true, cellId, true, true, 0);
				return 0;
			}
			emit TicketBought(player, won, cellId, false, false, 0);
			return 0;
		}

		cellOwner[cellId] = player;
		if (cellId < polygonCount) {
			uint8 bonus = rollBonus(cellId, player);
			winLit++;
			emit TicketBought(player, true, cellId, true, false, bonus);
			if (winLit == polygonCount) {
				return 1;
			}
			return 0;
		}
		loseLit++;
		emit TicketBought(player, false, cellId, true, false, 0);
		if (loseLit == loseCount) {
			return 2;
		}
		return 0;
	}

	function rollBonus(uint256 cellId, address player) private returns (uint8) {
		uint256 n = polygonCount;
		uint256 den = n * n * 3;
		uint256 jack = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, player, nonce)));
		nonce++;
		uint256 roll = jack % den;
		uint8 kind = 0;
		if (roll < 3) {
			kind = NOVA;
		} else if (roll < 3 + 3 * n) {
			kind = NUCLEUS;
		} else if (roll < 3 + 3 * n + n * n) {
			kind = SPARK;
		}
		if (kind == 0) {
			return 0;
		}
		uint256 extra = payoutOf(kind);
		if (houseBankroll() < extra) {
			return 0;
		}
		cellBonus[cellId] = kind;
		bonusLocked += extra;
		return kind;
	}

	function settlePlayers() private {
		address[] memory roundOwners = new address[](polygonCount);
		address[] memory roundMates = new address[](polygonCount);
		uint256 pieces = 0;
		uint256 bonusBits = 0;
		for (uint256 i = 0; i < polygonCount; i++) {
			roundOwners[i] = cellOwner[i];
			pieces++;
			address mate = cellMate[i];
			if (mate != address(0)) {
				roundMates[i] = mate;
				pieces++;
			}
			uint8 kind = cellBonus[i];
			if (kind != 0) {
				bonusBits |= uint256(kind) << (2 * i);
			}
		}
		uint256 share = pot / pieces;
		uint256 payout = 0;
		for (uint256 i = 0; i < polygonCount; i++) {
			prizes[roundOwners[i]] += share;
			payout += share;
			uint8 kind = cellBonus[i];
			if (kind != 0) {
				uint256 extraPay = payoutOf(kind);
				prizes[roundOwners[i]] += extraPay;
				payout += extraPay;
			}
			if (roundMates[i] == address(0)) {
				continue;
			}
			prizes[roundMates[i]] += share;
			payout += share;
		}
		pot = 0;
		resetBoard();
		reserved += payout;
		settleCount++;
		uint256 id = settleCount;
		uint256 holdersCount = 0;
		for (uint256 i = 0; i < polygonCount; i++) {
			address owner = roundOwners[i];
			if (heldSettle[owner] == 0) {
				heldSettle[owner] = id;
				holdersCount++;
			}
			address mate = roundMates[i];
			if (mate == address(0) || heldSettle[mate] != 0) {
				continue;
			}
			heldSettle[mate] = id;
			holdersCount++;
		}
		if (holdersCount > 0) {
			settledOwners[id] = roundOwners;
			settledMates[id] = roundMates;
			settledPrize[id] = payout;
			settledBonusBits[id] = bonusBits;
			heldCount[id] = holdersCount;
		}
		emit Settled(payout, roundOwners, true, roundMates, bonusBits);
	}

	function settleHouse() private {
		pot = 0;
		resetBoard();
		emit Settled(0, new address[](0), false, new address[](0), 0);
	}

	function resetBoard() private {
		uint256 total = polygonCount + loseCount;
		for (uint256 i = 0; i < total; i++) {
			delete cellOwner[i];
			delete cellBonus[i];
			if (i < polygonCount) {
				delete cellMate[i];
			}
		}
		winLit = 0;
		loseLit = 0;
		bonusLocked = 0;
	}

	function payoutOf(uint8 kind) private view returns (uint256) {
		if (kind == SPARK) {
			return ticketPrice;
		}
		if (kind == NUCLEUS) {
			return jackpot();
		}
		if (kind == NOVA) {
			return jackpot() * polygonCount;
		}
		return 0;
	}

	function jackpot() private view returns (uint256) {
		return ticketPrice * (polygonCount + loseCount);
	}

	function houseBankroll() private view returns (uint256) {
		uint256 locked = reserved + pot + bonusLocked;
		uint256 bal = address(this).balance;
		if (bal <= locked) {
			return 0;
		}
		return bal - locked;
	}

}
