// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPolygonsFactory {
	function principalOf(address account) external view returns (address);
}


contract Polygons {
	address public createdBy;
	address public factory;
	uint256 public createdAt;

	uint256 public polygonCount;
	uint256 public loseCount;
	uint256 public ticketPrice;
	uint256 public winLit;
	uint256 public loseLit;
	uint256 public pot;
	uint256 public reserved;

	uint256 public totalShares;
	mapping(address => uint256) public shares;
	mapping(address => uint256) public lastWithdrawAt;

	mapping(uint256 => address) public cellOwner;
	mapping(address => uint256) public prizes;
	uint256 private settleCount;
	mapping(uint256 => address[]) private settledOwners;
	mapping(uint256 => uint256) private settledPrize;
	mapping(uint256 => uint256) private heldCount;
	mapping(address => uint256) private heldSettle;

	uint256 public constant MIN_POLYGONS = 6;
	uint256 public constant MAX_POLYGONS = 36;
	uint256 public constant CHIP = 0.01 ether;
	uint256 public constant WITHDRAW_INTERVAL = 1 days;
	uint256 public constant MAX_TICKETS = 25;

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
	}

	event TicketBought(address indexed player, bool won, uint256 polygonId, bool assigned, bool split, bool bounce, uint256 fromId);
	event TicketsRefunded(address indexed player, uint256 count, uint256 amount);
	event PrizePaid(address indexed player, uint256 amount);
	event Settled(uint256 prize, address[] owners, bool playersWin, address[] mates, address closer);
	event Deposited(address indexed user, uint256 amount);

	constructor() {
		createdBy = address(1);
	}

	function initialize(
		address _createdBy,
		uint256 _polygonCount,
		uint256,
		uint256 _ticketPrice
	) external payable {
		require(createdBy == address(0), "Init");
		require(_polygonCount >= MIN_POLYGONS && _polygonCount <= MAX_POLYGONS, "Bad polygons");
		require(_ticketPrice >= CHIP, "Price too small");
		createdBy = _createdBy;
		factory = msg.sender;
		createdAt = block.timestamp;
		polygonCount = _polygonCount;
		loseCount = (_polygonCount * 9) / 10;
		ticketPrice = _ticketPrice;
		totalShares = msg.value;
		shares[_createdBy] = msg.value;
		emit Deposited(_createdBy, msg.value);
	}

	function principal() private view returns (address) {
		return IPolygonsFactory(factory).principalOf(msg.sender);
	}

	function getTable() public view returns (TableDTO memory) {
		address account = principal();
		uint256 total = polygonCount + loseCount;
		uint256 held = heldSettle[account];
		bool holding = prizes[account] > 0 && held != 0;
		address[] memory owners = new address[](total);
		address[] memory mates = new address[](polygonCount);
		uint256 shownWin = winLit;
		uint256 shownPrize = pot;
		for (uint256 i = 0; i < total; i++) {
			if (holding && i < polygonCount) {
				owners[i] = settledOwners[held][i];
			} else if (!holding) {
				owners[i] = cellOwner[i];
			}
		}
		if (holding) {
			shownWin = 0;
			for (uint256 i = 0; i < polygonCount; i++) {
				if (owners[i] != address(0)) {
					shownWin++;
				}
			}
			shownPrize = settledPrize[held];
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
			mates: mates
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
			} else {
				heldCount[id] = left;
			}
		}
		emit PrizePaid(account, amount);
		payable(msg.sender).transfer(amount);
	}

	function buyTicket() external payable {
		takeTickets(1);
	}

	function buyTickets(uint256 count) external payable {
		takeTickets(count);
	}

	function takeTickets(uint256 count) private {
		address player = principal();
		require(prizes[player] == 0, "Claim first");
		require(count > 0 && count <= MAX_TICKETS, "Bad count");
		require(msg.value == ticketPrice * count, "Wrong price");
		uint256 used = 0;
		uint8 outcome = 0;
		bool broke = false;
		while (used < count) {
			uint256 nextPot = pot + ticketPrice * 2;
			uint256 unspent = ticketPrice * (count - used - 1);
			if (address(this).balance < unspent + reserved + nextPot) {
				require(winLit > 0, "Bankroll");
				broke = true;
				break;
			}
			pot = nextPot;
			used += 1;
			outcome = drawTicket(player);
			if (outcome != 0) {
				break;
			}
			if (houseBankroll() < ticketPrice && winLit > 0) {
				broke = true;
				break;
			}
		}
		uint256 leftover = count - used;
		if (leftover > 0) {
			uint256 refund = ticketPrice * leftover;
			(bool ok, ) = payable(msg.sender).call{value: refund}("");
			require(ok, "Refund failed");
			emit TicketsRefunded(player, leftover, refund);
		}
		if (broke) {
			settlePlayers(address(0));
		} else if (outcome == 1) {
			settlePlayers(player);
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
			uint256 bounceSeed = uint256(keccak256(abi.encodePacked(seed, cellId, nonce)));
			(uint256 dest, bool found) = nextEmpty(!won, bounceSeed);
			if (!found) {
				emit TicketBought(player, won, cellId, false, false, false, cellId);
				return 0;
			}
			return assignCell(player, dest, true, cellId);
		}
		return assignCell(player, cellId, false, cellId);
	}

	function assignCell(address player, uint256 cellId, bool bounce, uint256 fromId) private returns (uint8 outcome) {
		cellOwner[cellId] = player;
		if (cellId < polygonCount) {
			winLit++;
			emit TicketBought(player, true, cellId, true, false, bounce, fromId);
			if (winLit == polygonCount) {
				return 1;
			}
			return 0;
		}
		loseLit++;
		emit TicketBought(player, false, cellId, true, false, bounce, fromId);
		if (loseLit == loseCount) {
			return 2;
		}
		return 0;
	}

	function nextEmpty(bool house, uint256 seed) private view returns (uint256 dest, bool found) {
		uint256 start = 0;
		uint256 end = polygonCount;
		if (house) {
			start = polygonCount;
			end = polygonCount + loseCount;
		}
		uint256 emptyCount = 0;
		for (uint256 i = start; i < end; i++) {
			if (cellOwner[i] == address(0)) {
				emptyCount++;
			}
		}
		if (emptyCount == 0) {
			return (0, false);
		}
		uint256 pick = seed % emptyCount;
		uint256 seen = 0;
		for (uint256 i = start; i < end; i++) {
			if (cellOwner[i] != address(0)) {
				continue;
			}
			if (seen == pick) {
				return (i, true);
			}
			seen++;
		}
	}

	function settlePlayers(address closer) private {
		address[] memory roundOwners = new address[](polygonCount);
		uint256 pieces = 0;
		for (uint256 i = 0; i < polygonCount; i++) {
			address owner = cellOwner[i];
			if (owner == address(0)) {
				continue;
			}
			roundOwners[i] = owner;
			pieces += 1;
		}
		if (closer != address(0)) {
			pieces += 1;
		}
		uint256 share = pot / pieces;
		uint256 payout = 0;
		for (uint256 i = 0; i < polygonCount; i++) {
			if (roundOwners[i] == address(0)) {
				continue;
			}
			prizes[roundOwners[i]] += share;
			payout += share;
		}
		if (closer != address(0)) {
			prizes[closer] += share;
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
			if (owner == address(0) || heldSettle[owner] != 0) {
				continue;
			}
			heldSettle[owner] = id;
			holdersCount++;
		}
		if (holdersCount > 0) {
			settledOwners[id] = roundOwners;
			settledPrize[id] = payout;
			heldCount[id] = holdersCount;
		}
		emit Settled(payout, roundOwners, true, new address[](0), closer);
	}

	function settleHouse() private {
		pot = 0;
		resetBoard();
		emit Settled(0, new address[](0), false, new address[](0), address(0));
	}

	function resetBoard() private {
		uint256 total = polygonCount + loseCount;
		for (uint256 i = 0; i < total; i++) {
			delete cellOwner[i];
		}
		winLit = 0;
		loseLit = 0;
	}

	function houseBankroll() private view returns (uint256) {
		uint256 locked = reserved + pot;
		uint256 bal = address(this).balance;
		if (bal <= locked) {
			return 0;
		}
		return bal - locked;
	}

}
