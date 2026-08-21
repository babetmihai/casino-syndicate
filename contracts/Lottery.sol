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
	uint256 public bonusLit;
	uint256 public pot;
	uint256 public reserved;

	uint256 public totalShares;
	mapping(address => uint256) public shares;
	mapping(address => uint256) public lastWithdrawAt;
	address[] private holders;
	mapping(address => uint256) private holderIndex;

	mapping(uint256 => address) public cellOwner;
	mapping(uint256 => address) private cellMate;
	mapping(uint256 => bool) private cellBonus;
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

	event TicketBought(address indexed player, bool won, uint256 polygonId, bool assigned, bool split, bool bonus);
	event PrizePaid(address indexed player, uint256 amount);
	event Settled(uint256 prize, address[] owners, bool playersWin, address[] mates, uint256 bonusBits);
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
		loseCount = _polygonCount - 1;
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
		address[] memory mates = new address[](polygonCount);
		uint256 shownWin = winLit;
		uint256 shownPrize = pot + bonusLit * jackpot();
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
				if (cellBonus[i]) {
					bonusBits |= uint256(1) << i;
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
			owned = (bankroll * shares[msg.sender]) / totalShares;
		}
		return TableDTO({
			polygonCount: polygonCount,
			loseCount: loseCount,
			ticketPrice: ticketPrice,
			claimedCount: shownWin,
			loseLit: loseLit,
			prize: shownPrize,
			myPrize: prizes[msg.sender],
			memberShares: owned,
			totalBalance: bankroll,
			lastWithdrawAt: lastWithdrawAt[msg.sender],
			owner: createdBy,
			owners: owners,
			mates: mates,
			bonusBits: bonusBits
		});
	}

	function setName(string calldata _name) external {
		require(msg.sender == createdBy || msg.sender == factory, "Only owner");
		require(bytes(_name).length > 0, "Name required");
		name = _name;
	}

	function depositShares() public payable {
		require(msg.value > 0, "Send ETH");
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
				delete settledMates[id];
				delete settledBonusBits[id];
			} else {
				heldCount[id] = left;
			}
		}
		emit PrizePaid(msg.sender, amount);
		payable(msg.sender).transfer(amount);
	}

	function buyTicket() external payable {
		require(prizes[msg.sender] == 0, "Claim first");
		require(msg.value == ticketPrice, "Wrong price");
		pot += msg.value;
		uint8 outcome = drawTicket();
		if (outcome == 1) {
			settlePlayers();
		} else if (outcome == 2) {
			settleHouse();
		}
	}

	function drawTicket() private returns (uint8 outcome) {
		uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender, nonce)));
		nonce++;
		uint256 total = polygonCount + loseCount;
		uint256 cellId = seed % total;
		address owner = cellOwner[cellId];
		if (owner != address(0)) {
			bool won = cellId < polygonCount;
			if (won && cellMate[cellId] == address(0) && owner != msg.sender) {
				cellMate[cellId] = msg.sender;
				emit TicketBought(msg.sender, true, cellId, true, true, false);
				return 0;
			}
			emit TicketBought(msg.sender, won, cellId, false, false, false);
			return 0;
		}

		cellOwner[cellId] = msg.sender;
		if (cellId < polygonCount) {
			bool bonus = rollBonus(cellId);
			winLit++;
			emit TicketBought(msg.sender, true, cellId, true, false, bonus);
			if (winLit == polygonCount) {
				return 1;
			}
			return 0;
		}
		loseLit++;
		emit TicketBought(msg.sender, false, cellId, true, false, false);
		if (loseLit == loseCount) {
			return 2;
		}
		return 0;
	}

	function rollBonus(uint256 cellId) private returns (bool) {
		uint256 extra = jackpot();
		if (houseBankroll() < extra) {
			return false;
		}
		uint256 jack = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender, nonce)));
		nonce++;
		if (jack % polygonCount != 0) {
			return false;
		}
		cellBonus[cellId] = true;
		bonusLit++;
		return true;
	}

	function settlePlayers() private {
		address[] memory roundOwners = new address[](polygonCount);
		address[] memory roundMates = new address[](polygonCount);
		uint256 pieces = 0;
		uint256 bonusBits = 0;
		uint256 extra = jackpot();
		for (uint256 i = 0; i < polygonCount; i++) {
			roundOwners[i] = cellOwner[i];
			pieces++;
			address mate = cellMate[i];
			if (mate != address(0)) {
				roundMates[i] = mate;
				pieces++;
			}
			if (cellBonus[i]) {
				bonusBits |= uint256(1) << i;
			}
		}
		uint256 share = pot / pieces;
		uint256 payout = 0;
		for (uint256 i = 0; i < polygonCount; i++) {
			prizes[roundOwners[i]] += share;
			payout += share;
			uint256 bonusPay = 0;
			if (cellBonus[i]) {
				bonusPay = extra;
				if (roundMates[i] != address(0)) {
					bonusPay = extra / 2;
				}
				prizes[roundOwners[i]] += bonusPay;
				payout += bonusPay;
			}
			if (roundMates[i] == address(0)) {
				continue;
			}
			prizes[roundMates[i]] += share;
			payout += share;
			if (bonusPay > 0) {
				prizes[roundMates[i]] += extra - bonusPay;
				payout += extra - bonusPay;
			}
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
		bonusLit = 0;
	}

	function jackpot() private view returns (uint256) {
		return ticketPrice * (polygonCount + loseCount);
	}

	function houseBankroll() private view returns (uint256) {
		uint256 locked = reserved + pot + bonusLit * jackpot();
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
