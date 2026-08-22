// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBlackjackFactory {
	function principalOf(address account) external view returns (address);
}


contract Blackjack {
	address public createdBy;
	address public factory;
	uint256 public createdAt;

	uint256 public totalShares;
	uint256 public minBet;
	uint256 public maxBet;
	mapping(address => uint256) public shares;
	mapping(address => uint256) public lastWithdrawAt;

	uint256 public constant CHIP = 0.01 ether;
	uint256 public constant MIN_DEPOSIT = 1 ether;
	uint256 public constant WITHDRAW_INTERVAL = 1 days;
	uint64 public constant ROUND_TIMEOUT = 1 days;
	uint8 public constant SEAT_COUNT = 3;
	uint8 public constant HAND_COUNT = 4;
	uint8 public constant MAX_CARDS = 12;

	uint8 public constant PHASE_BETTING = 0;
	uint8 public constant PHASE_ACTING = 1;

	uint8 public constant EMPTY = 0;
	uint8 public constant PLAYING = 1;
	uint8 public constant STAND = 2;
	uint8 public constant BUST = 3;
	uint8 public constant BLACKJACK = 4;
	uint8 public constant DOUBLED = 5;

	struct HandDTO {
		uint256 bet;
		uint8 status;
		uint8 count;
		uint8[12] cards;
	}

	struct SeatDTO {
		address player;
		HandDTO[4] hands;
	}

	struct TableDTO {
		uint256 memberShares;
		uint256 totalBalance;
		uint256 minBet;
		uint256 maxBet;
		uint256 lastWithdrawAt;
		address owner;
		uint8 phase;
		uint8 currentSeat;
		uint8 currentHand;
		uint8 dealerCount;
		uint64 turnStartedAt;
		uint8[12] dealerCards;
		SeatDTO[3] seats;
	}

	struct Seat {
		address player;
		address payer;
		uint256[4] bets;
		uint8[4] counts;
		uint8[4] status;
		uint8[12][4] cards;
	}

	Seat[3] private seats;
	uint8[12] private dealerCards;
	uint8 public phase;
	uint8 public currentSeat;
	uint8 public currentHand;
	uint8 public dealerCount;
	uint64 public turnStartedAt;
	uint256 public reserved;
	uint256 private nonce;

	event Deposited(address indexed user, uint256 amount);
	event Dealt(uint8 dealerCard);
	event Acted(address indexed player, uint8 seat, uint8 hand, uint8 kind, uint8 card);
	event Settled(uint8 dealerTotal, uint8 dealerCount, uint8[12] dealerCards);
	event Paid(address indexed player, uint8 seat, uint256 wagered, uint256 payout);

	constructor(address _createdBy, uint256 _minBet, uint256 _maxBet) payable {
		require(msg.value >= MIN_DEPOSIT, "Min deposit 1");
		require(_minBet >= CHIP, "Min too small");
		require(_maxBet >= _minBet, "Max below min");
		createdBy = _createdBy;
		factory = msg.sender;
		createdAt = block.timestamp;
		minBet = _minBet;
		maxBet = _maxBet;
		totalShares = msg.value;
		shares[_createdBy] = msg.value;
		emit Deposited(_createdBy, msg.value);
	}

	function principal() private view returns (address) {
		return IBlackjackFactory(factory).principalOf(msg.sender);
	}

	function getTable() public view returns (TableDTO memory table) {
		address account = principal();
		uint256 bankroll = houseBankroll();
		uint256 owned = 0;
		if (totalShares > 0 && bankroll > 0) {
			owned = (bankroll * shares[account]) / totalShares;
		}
		table.memberShares = owned;
		table.totalBalance = bankroll;
		table.minBet = minBet;
		table.maxBet = maxBet;
		table.lastWithdrawAt = lastWithdrawAt[account];
		table.owner = createdBy;
		table.phase = phase;
		table.currentSeat = currentSeat;
		table.currentHand = currentHand;
		table.dealerCount = dealerCount;
		table.turnStartedAt = turnStartedAt;
		table.dealerCards = dealerCards;
		for (uint8 i = 0; i < SEAT_COUNT; i++) {
			table.seats[i] = viewSeat(i);
		}
	}

	function depositShares() public payable {
		require(msg.value > 0, "Must send some Ether");
		address account = principal();
		uint256 previousBalance = houseBankroll();
		if (previousBalance >= msg.value) {
			previousBalance -= msg.value;
		} else {
			previousBalance = 0;
		}
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

	function deal(uint256[3] memory bets) external payable {
		require(phase == PHASE_BETTING, "Wait");
		clearBoard();
		address account = principal();
		uint256 totalBetAmount = 0;
		for (uint8 i = 0; i < SEAT_COUNT; i++) {
			totalBetAmount += bets[i];
			if (bets[i] == 0) {
				continue;
			}
			if (bets[i] < minBet) {
				revert("Bet amount must be at least minBet");
			}
			if (bets[i] > maxBet) {
				revert("Bet amount must be less than maxBetAmount");
			}
		}
		require(totalBetAmount > 0, "Must bet some Ether");
		require(msg.value == totalBetAmount, "Total bet amount must equal sent Ether");
		reserved = totalBetAmount * 8;
		require(address(this).balance >= reserved, "Table cannot cover this bet");
		for (uint8 i = 0; i < SEAT_COUNT; i++) {
			if (bets[i] == 0) {
				continue;
			}
			seats[i].player = account;
			seats[i].payer = msg.sender;
			seats[i].bets[0] = bets[i];
			dealTo(i, 0);
			dealTo(i, 0);
			seats[i].status[0] = PLAYING;
			if (valueOf(i, 0) == 21) {
				seats[i].status[0] = BLACKJACK;
			}
		}
		uint8 up = drawCard();
		dealerCards[0] = up;
		dealerCount = 1;
		phase = PHASE_ACTING;
		emit Dealt(up);
		nextTurn();
	}

	function hit() external {
		takeAction(0);
	}

	function stand() external {
		takeAction(1);
	}

	function doubleDown() external payable {
		takeAction(2);
	}

	function split() external payable {
		takeAction(3);
	}

	function forceClose() external {
		require(phase == PHASE_ACTING, "Wait");
		require(block.timestamp >= turnStartedAt + ROUND_TIMEOUT, "Wait");
		address[3] memory payers;
		uint256[3] memory amounts;
		for (uint8 i = 0; i < SEAT_COUNT; i++) {
			payers[i] = seats[i].payer;
			for (uint8 h = 0; h < HAND_COUNT; h++) {
				amounts[i] += seats[i].bets[h];
			}
		}
		clearBoard();
		phase = PHASE_BETTING;
		reserved = 0;
		for (uint8 i = 0; i < SEAT_COUNT; i++) {
			if (amounts[i] > 0) {
				payable(payers[i]).transfer(amounts[i]);
			}
		}
	}

	function takeAction(uint8 kind) private {
		require(phase == PHASE_ACTING, "Wait");
		address account = principal();
		uint8 seat = currentSeat;
		require(seats[seat].player == account, "Turn");
		uint8 hand = currentHand;
		require(seats[seat].status[hand] == PLAYING, "Playing");
		uint8 card = 0;
		if (kind == 0) {
			card = dealTo(seat, hand);
			uint8 total = valueOf(seat, hand);
			if (total > 21) {
				seats[seat].status[hand] = BUST;
			} else if (total == 21) {
				seats[seat].status[hand] = STAND;
			}
		} else if (kind == 1) {
			seats[seat].status[hand] = STAND;
		} else if (kind == 2) {
			require(seats[seat].counts[hand] == 2, "Double");
			require(msg.value == seats[seat].bets[hand], "Double");
			seats[seat].bets[hand] += msg.value;
			seats[seat].payer = msg.sender;
			card = dealTo(seat, hand);
			if (valueOf(seat, hand) > 21) {
				seats[seat].status[hand] = BUST;
			} else {
				seats[seat].status[hand] = DOUBLED;
			}
		} else {
			require(seats[seat].counts[hand] == 2, "Split");
			require(canSplitCards(seats[seat].cards[hand][0], seats[seat].cards[hand][1]), "Split");
			uint8 next = emptyHand(seat);
			require(next < HAND_COUNT, "Split");
			require(msg.value == seats[seat].bets[hand], "Split");
			uint8 splitCard = seats[seat].cards[hand][1];
			seats[seat].cards[hand][1] = 0;
			seats[seat].counts[hand] = 1;
			seats[seat].bets[next] = msg.value;
			seats[seat].cards[next][0] = splitCard;
			seats[seat].counts[next] = 1;
			seats[seat].status[next] = PLAYING;
			seats[seat].payer = msg.sender;
			bool aces = rankOf(seats[seat].cards[hand][0]) == 0;
			dealTo(seat, hand);
			dealTo(seat, next);
			if (aces) {
				seats[seat].status[hand] = STAND;
				seats[seat].status[next] = STAND;
			} else {
				if (valueOf(seat, hand) == 21) {
					seats[seat].status[hand] = STAND;
				}
				if (valueOf(seat, next) == 21) {
					seats[seat].status[next] = STAND;
				}
			}
		}
		emit Acted(account, seat, hand, kind, card);
		if (seats[seat].status[hand] != PLAYING) {
			nextTurn();
		} else {
			turnStartedAt = uint64(block.timestamp);
		}
	}

	function nextTurn() private {
		for (uint8 s = 0; s < SEAT_COUNT; s++) {
			for (uint8 h = 0; h < HAND_COUNT; h++) {
				if (seats[s].status[h] != PLAYING) {
					continue;
				}
				currentSeat = s;
				currentHand = h;
				turnStartedAt = uint64(block.timestamp);
				return;
			}
		}
		settle();
	}

	function settle() private {
		while (dealerCount < MAX_CARDS && dealerValue() < 17) {
			dealerCards[dealerCount] = drawCard();
			dealerCount++;
		}
		uint8 dealerTotal = dealerValue();
		bool dealerBust = dealerTotal > 21;
		bool dealerBj = dealerCount == 2 && dealerTotal == 21;
		uint256[3] memory payouts;
		uint256[3] memory wagered;
		address[3] memory payers;
		address[3] memory players;
		for (uint8 i = 0; i < SEAT_COUNT; i++) {
			if (seats[i].player == address(0) || seats[i].bets[0] == 0) {
				continue;
			}
			uint256 pay = 0;
			uint256 spent = 0;
			for (uint8 h = 0; h < HAND_COUNT; h++) {
				uint256 bet = seats[i].bets[h];
				if (bet == 0) {
					continue;
				}
				spent += bet;
				pay += handPayout(i, h, dealerTotal, dealerBj, dealerBust);
			}
			payouts[i] = pay;
			wagered[i] = spent;
			payers[i] = seats[i].payer;
			players[i] = seats[i].player;
		}
		phase = PHASE_BETTING;
		reserved = 0;
		currentSeat = 0;
		currentHand = 0;
		turnStartedAt = 0;
		emit Settled(dealerTotal, dealerCount, dealerCards);
		for (uint8 i = 0; i < SEAT_COUNT; i++) {
			if (players[i] == address(0)) {
				continue;
			}
			emit Paid(players[i], i, wagered[i], payouts[i]);
			if (payouts[i] > 0) {
				payable(payers[i]).transfer(payouts[i]);
			}
		}
	}

	function handPayout(
		uint8 seat,
		uint8 hand,
		uint8 dealerTotal,
		bool dealerBj,
		bool dealerBust
	) private view returns (uint256) {
		uint8 st = seats[seat].status[hand];
		uint256 bet = seats[seat].bets[hand];
		if (bet == 0 || st == BUST) {
			return 0;
		}
		bool playerBj = st == BLACKJACK;
		if (dealerBj) {
			if (playerBj) {
				return bet;
			}
			return 0;
		}
		if (playerBj) {
			return bet + (bet * 3) / 2;
		}
		uint8 pt = valueOf(seat, hand);
		if (dealerBust || pt > dealerTotal) {
			return bet * 2;
		}
		if (pt == dealerTotal) {
			return bet;
		}
		return 0;
	}

	function dealTo(uint8 seat, uint8 hand) private returns (uint8 card) {
		uint8 count = seats[seat].counts[hand];
		require(count < MAX_CARDS, "Cards");
		card = drawCard();
		seats[seat].cards[hand][count] = card;
		seats[seat].counts[hand] = count + 1;
	}

	function drawCard() private returns (uint8) {
		nonce++;
		return uint8(uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender, nonce))) % 52);
	}

	function clearBoard() private {
		for (uint8 i = 0; i < SEAT_COUNT; i++) {
			delete seats[i];
		}
		delete dealerCards;
		dealerCount = 0;
		currentSeat = 0;
		currentHand = 0;
		turnStartedAt = 0;
	}

	function viewSeat(uint8 i) private view returns (SeatDTO memory row) {
		Seat storage s = seats[i];
		row.player = s.player;
		for (uint8 h = 0; h < HAND_COUNT; h++) {
			row.hands[h] = viewHand(s, h);
		}
	}

	function viewHand(Seat storage s, uint8 h) private view returns (HandDTO memory hand) {
		hand.bet = s.bets[h];
		hand.status = s.status[h];
		hand.count = s.counts[h];
		for (uint8 i = 0; i < MAX_CARDS; i++) {
			hand.cards[i] = s.cards[h][i];
		}
	}

	function valueOf(uint8 seat, uint8 hand) private view returns (uint8 total) {
		uint8 aces = 0;
		uint8 count = seats[seat].counts[hand];
		for (uint8 i = 0; i < count; i++) {
			uint8 r = rankOf(seats[seat].cards[hand][i]);
			if (r == 0) {
				aces++;
				total += 11;
			} else if (r >= 9) {
				total += 10;
			} else {
				total += r + 1;
			}
		}
		while (total > 21 && aces > 0) {
			total -= 10;
			aces--;
		}
	}

	function dealerValue() private view returns (uint8 total) {
		uint8 aces = 0;
		for (uint8 i = 0; i < dealerCount; i++) {
			uint8 r = rankOf(dealerCards[i]);
			if (r == 0) {
				aces++;
				total += 11;
			} else if (r >= 9) {
				total += 10;
			} else {
				total += r + 1;
			}
		}
		while (total > 21 && aces > 0) {
			total -= 10;
			aces--;
		}
	}

	function rankOf(uint8 card) private pure returns (uint8) {
		return card % 13;
	}

	function isTenOrFace(uint8 card) private pure returns (bool) {
		uint8 r = rankOf(card);
		return r == 9 || r == 10 || r == 11 || r == 12;
	}

	function canSplitCards(uint8 a, uint8 b) private pure returns (bool) {
		if (rankOf(a) == rankOf(b)) {
			return true;
		}
		return isTenOrFace(a) && isTenOrFace(b);
	}

	function emptyHand(uint8 seat) private view returns (uint8) {
		for (uint8 h = 0; h < HAND_COUNT; h++) {
			if (seats[seat].status[h] == EMPTY) {
				return h;
			}
		}
		return HAND_COUNT;
	}

	function houseBankroll() private view returns (uint256) {
		uint256 locked = lockedFunds();
		uint256 bal = address(this).balance;
		if (bal <= locked) {
			return 0;
		}
		return bal - locked;
	}

	function lockedFunds() private view returns (uint256) {
		if (phase == PHASE_ACTING) {
			return reserved;
		}
		return 0;
	}
}
