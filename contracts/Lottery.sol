// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ILotteryFactory {
	function setGameOwner(address owner) external;
}


contract Lottery {
	string public name;
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
	address[] private holders;
	mapping(address => uint256) private holderIndex;

	mapping(uint256 => address) public cellOwner;
	mapping(address => uint256) public prizes;
	uint256 private settleCount;
	mapping(uint256 => address[]) private settledOwners;
	mapping(uint256 => uint256) private settledPrize;
	mapping(uint256 => uint256) private heldCount;
	mapping(address => uint256) private heldSettle;

	uint256 public constant MIN_POLYGONS = 3;
	uint256 public constant MAX_POLYGONS = 24;
	uint256 public constant CHIP = 0.01 ether;
	uint256 public constant MIN_DEPOSIT = 1 ether;
	uint256 public constant WITHDRAW_INTERVAL = 1 days;

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
	}

	event TicketBought(address indexed player, bool won, uint256 polygonId, bool assigned);
	event TicketsRefunded(address indexed player, uint256 count, uint256 amount);
	event PrizePaid(address indexed player, uint256 amount);
	event Settled(uint256 prize, address[] owners, bool playersWin);
	event Deposited(address indexed user, uint256 amount);

	constructor(
		string memory _name,
		address _createdBy,
		uint256 _polygonCount,
		uint256 _ticketPrice
	) payable {
		require(msg.value >= MIN_DEPOSIT, "Min deposit 1");
		require(bytes(_name).length > 0, "Name required");
		require(_polygonCount >= MIN_POLYGONS && _polygonCount <= MAX_POLYGONS, "Bad polygons");
		require(_ticketPrice >= CHIP, "Price too small");
		name = _name;
		createdBy = _createdBy;
		factory = msg.sender;
		createdAt = block.timestamp;
		polygonCount = _polygonCount;
		loseCount = _polygonCount;
		ticketPrice = _ticketPrice;
		totalShares = msg.value;
		shares[_createdBy] = msg.value;
		addHolder(_createdBy);
		emit Deposited(_createdBy, msg.value);
	}

	function getTable() public view returns (TableDTO memory) {
		uint256 total = polygonCount + loseCount;
		uint256 held = heldSettle[msg.sender];
		bool holding = prizes[msg.sender] > 0 && held != 0;
		address[] memory owners = new address[](total);
		uint256 shownWin = winLit;
		uint256 shownLose = loseLit;
		uint256 shownPot = pot;
		for (uint256 i = 0; i < total; i++) {
			if (holding && i < polygonCount) {
				owners[i] = settledOwners[held][i];
			} else if (!holding) {
				owners[i] = cellOwner[i];
			}
		}
		if (holding) {
			shownWin = polygonCount;
			shownLose = 0;
			shownPot = settledPrize[held];
		}
		uint256 bankroll = houseBankroll();
		uint256 owned = 0;
		if (totalShares > 0 && bankroll > 0) {
			owned = (bankroll * shares[msg.sender]) / totalShares;
		}
		return TableDTO({
			polygonCount: polygonCount,
			loseCount: loseCount,
			ticketPrice: ticketPrice,
			claimedCount: shownWin,
			loseLit: shownLose,
			prize: shownPot,
			myPrize: prizes[msg.sender],
			memberShares: owned,
			totalBalance: bankroll,
			lastWithdrawAt: lastWithdrawAt[msg.sender],
			owner: createdBy,
			owners: owners
		});
	}

	function setName(string calldata _name) external {
		require(msg.sender == createdBy || msg.sender == factory, "Only owner");
		require(bytes(_name).length > 0, "Name required");
		name = _name;
	}

	function depositShares() public payable {
		require(msg.value > 0, "Must send some Ether");
		uint256 previousBalance = houseBankroll() - msg.value;
		uint256 memberShares = msg.value;
		bool ownsAll = totalShares > 0 && shares[msg.sender] == totalShares;
		if (totalShares > 0 && previousBalance > 0 && !ownsAll) {
			memberShares = (msg.value * totalShares) / previousBalance;
			require(memberShares > 0, "Share calculation resulted in zero");
		}

		totalShares += memberShares;
		shares[msg.sender] += memberShares;
		addHolder(msg.sender);
		syncOwner();
		emit Deposited(msg.sender, msg.value);
	}

	function withdrawShares(uint256 amount) external {
		require(amount > 0, "Must withdraw some Ether");
		uint256 previous = lastWithdrawAt[msg.sender];
		if (previous != 0) {
			require(block.timestamp >= previous + WITHDRAW_INTERVAL, "Once per day");
		}
		uint256 memberShares = shares[msg.sender];
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
		shares[msg.sender] -= burned;
		if (shares[msg.sender] == 0) {
			delete shares[msg.sender];
			removeHolder(msg.sender);
		}
		syncOwner();
		lastWithdrawAt[msg.sender] = block.timestamp;
		payable(msg.sender).transfer(amount);
	}

	function withdrawPrize() external {
		uint256 amount = prizes[msg.sender];
		require(amount > 0, "No prize");
		prizes[msg.sender] = 0;
		reserved -= amount;
		uint256 id = heldSettle[msg.sender];
		delete heldSettle[msg.sender];
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
		emit PrizePaid(msg.sender, amount);
		payable(msg.sender).transfer(amount);
	}

	function buyTicket() external payable {
		drawTickets(1);
	}

	function buyTickets(uint256 count) external payable {
		drawTickets(count);
	}

	function drawTickets(uint256 count) private {
		require(prizes[msg.sender] == 0, "Claim first");
		require(count == 1 || count == 5 || count == 10, "Bad count");
		require(msg.value == ticketPrice * count, "Wrong price");
		uint256 incoming = msg.value;
		uint256 house = address(this).balance - reserved - pot - incoming;
		uint256 nextPot = pot + incoming;
		uint256 winSum = triangle(polygonCount);
		uint256 loseSum = triangle(loseCount);
		require(house * winSum >= nextPot * loseSum, "Table cannot cover this bet");
		uint256 used = 0;
		uint8 outcome = 0;
		for (; used < count; used++) {
			outcome = drawTicket();
			if (outcome != 0) {
				used++;
				break;
			}
		}
		uint256 leftover = count - used;
		uint256 refund = ticketPrice * leftover;
		if (outcome == 1) {
			settlePlayers();
		} else if (outcome == 2) {
			settleHouse();
		}
		if (refund > 0) {
			emit TicketsRefunded(msg.sender, leftover, refund);
			payable(msg.sender).transfer(refund);
		}
	}

	function drawTicket() private returns (uint8 outcome) {
		uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender, nonce)));
		nonce++;
		uint256 cellId = seed % (polygonCount + loseCount);
		pot += ticketPrice;
		if (cellOwner[cellId] != address(0)) {
			bool won = cellId < polygonCount;
			emit TicketBought(msg.sender, won, cellId, false);
			return 0;
		}

		cellOwner[cellId] = msg.sender;
		if (cellId < polygonCount) {
			winLit++;
			emit TicketBought(msg.sender, true, cellId, true);
			if (winLit == polygonCount) {
				return 1;
			}
			return 0;
		}
		loseLit++;
		emit TicketBought(msg.sender, false, cellId, true);
		if (loseLit == loseCount) {
			return 2;
		}
		return 0;
	}

	function settlePlayers() private {
		uint256 roundPot = pot;
		uint256 winSum = triangle(polygonCount);
		uint256 loseSum = triangle(loseCount);
		uint256 payout = (roundPot * (winSum + loseSum)) / winSum;
		address[] memory roundOwners = new address[](polygonCount);
		uint256 paid = 0;
		uint256 total = polygonCount + loseCount;
		for (uint256 i = 0; i < polygonCount; i++) {
			roundOwners[i] = cellOwner[i];
			uint256 share = (payout * (i + 1)) / winSum;
			if (i + 1 == polygonCount) {
				share = payout - paid;
			}
			prizes[cellOwner[i]] += share;
			paid += share;
		}
		for (uint256 i = 0; i < total; i++) {
			delete cellOwner[i];
		}
		reserved += payout;
		pot = 0;
		winLit = 0;
		loseLit = 0;
		settleCount++;
		uint256 id = settleCount;
		uint256 holdersCount = 0;
		for (uint256 i = 0; i < polygonCount; i++) {
			address owner = roundOwners[i];
			if (heldSettle[owner] != 0) {
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
		emit Settled(payout, roundOwners, true);
	}

	function settleHouse() private {
		uint256 taken = pot;
		uint256 total = polygonCount + loseCount;
		for (uint256 i = 0; i < total; i++) {
			delete cellOwner[i];
		}
		pot = 0;
		winLit = 0;
		loseLit = 0;
		address[] memory none = new address[](0);
		emit Settled(taken, none, false);
	}

	function triangle(uint256 n) private pure returns (uint256) {
		return (n * (n + 1)) / 2;
	}

	function houseBankroll() private view returns (uint256) {
		uint256 locked = reserved + pot;
		uint256 bal = address(this).balance;
		if (bal <= locked) {
			return 0;
		}
		return bal - locked;
	}

	function addHolder(address account) private {
		if (holderIndex[account] != 0) {
			return;
		}
		holders.push(account);
		holderIndex[account] = holders.length;
	}

	function removeHolder(address account) private {
		uint256 stored = holderIndex[account];
		if (stored == 0) {
			return;
		}
		uint256 i = stored - 1;
		uint256 lastPos = holders.length - 1;
		if (i != lastPos) {
			address last = holders[lastPos];
			holders[i] = last;
			holderIndex[last] = stored;
		}
		holders.pop();
		delete holderIndex[account];
	}

	function syncOwner() private {
		address next = createdBy;
		uint256 best = shares[next];
		for (uint256 i = 0; i < holders.length; i++) {
			address holder = holders[i];
			uint256 amount = shares[holder];
			if (amount > best) {
				best = amount;
				next = holder;
			}
		}
		if (next == createdBy) {
			return;
		}
		createdBy = next;
		ILotteryFactory(factory).setGameOwner(next);
	}
}
