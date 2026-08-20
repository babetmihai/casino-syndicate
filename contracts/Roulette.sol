// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract Roulette {
	string public name;
	address public createdBy;
	address public factory;
	uint256 public createdAt;

	uint256 public totalShares = 0;
	uint256 public minBet;
	uint256 public maxBet;
	mapping(address => uint256) public shares;
	mapping(address => uint256) public balances;
	mapping(address => uint256) public lastWithdrawAt;

	uint256 public constant CHIP = 0.01 ether;
	uint256 public constant MIN_DEPOSIT = 1 ether;
	uint256 public constant WITHDRAW_INTERVAL = 1 days;

	struct TableDTO {
		uint256 memberShares;
		uint256 playerBalance;
		uint256 totalShares;
		uint256 totalBalance;
		uint256 minBet;
		uint256 maxBet;
		uint256 lastWithdrawAt;
	}

	event Deposited(address indexed user, uint256 amount);
	event WinningNumber(uint256 number, uint256 totalBetAmount, uint256 winningAmount, uint256 playerBalance);

	constructor(string memory _name, address _createdBy, uint256 _minBet, uint256 _maxBet) payable {
		require(msg.value >= MIN_DEPOSIT, "Min deposit 1");
		require(bytes(_name).length > 0, "Name required");
		require(_minBet >= CHIP, "Min too small");
		require(_maxBet >= _minBet, "Max below min");
		name = _name;
		createdBy = _createdBy;
		factory = msg.sender;
		createdAt = block.timestamp;
		minBet = _minBet;
		maxBet = _maxBet;
		totalShares = msg.value;
		shares[_createdBy] = msg.value;
		emit Deposited(_createdBy, msg.value);
	}

	function getTable() public view returns (TableDTO memory) {
		uint256 bankroll = address(this).balance;
		uint256 owned = 0;
		if (totalShares > 0) {
			owned = (bankroll * shares[msg.sender]) / totalShares;
		}
		return TableDTO({
			memberShares: owned,
			playerBalance: balances[msg.sender],
			totalShares: bankroll,
			totalBalance: bankroll,
			minBet: minBet,
			maxBet: maxBet,
			lastWithdrawAt: lastWithdrawAt[msg.sender]
		});
	}

	function setName(string calldata _name) external {
		require(msg.sender == createdBy || msg.sender == factory, "Only owner");
		require(bytes(_name).length > 0, "Name required");
		name = _name;
	}

	function setLimits(uint256 _minBet, uint256 _maxBet) external {
		require(msg.sender == createdBy, "Only owner");
		require(_minBet >= CHIP, "Min too small");
		require(_maxBet >= _minBet, "Max below min");
		minBet = _minBet;
		maxBet = _maxBet;
	}

	function depositShares() public payable {
		require(msg.value > 0, "Must send some Ether");
		uint256 previousBalance = address(this).balance - msg.value;
		uint256 memberShares = msg.value;
		bool ownsAll = totalShares > 0 && shares[msg.sender] == totalShares;
		if (totalShares > 0 && previousBalance > 0 && !ownsAll) {
			memberShares = (msg.value * totalShares) / previousBalance;
			require(memberShares > 0, "Share calculation resulted in zero");
		}

		totalShares += memberShares;
		shares[msg.sender] += memberShares;
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
		uint256 bankroll = address(this).balance;
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
		}
		lastWithdrawAt[msg.sender] = block.timestamp;
		payable(msg.sender).transfer(amount);
	}

	function depositBalance() external payable {
		require(msg.value > 0, "Must send some Ether");
		balances[msg.sender] += msg.value;
		emit Deposited(msg.sender, msg.value);
	}

	function withdrawBalance() external {
		require(balances[msg.sender] > 0, "Must have a balance to withdraw");
		payable(msg.sender).transfer(balances[msg.sender]);
		delete balances[msg.sender];
	}

	// 0-36 straight, 37-48 outside, 49-108 splits, 109-120 streets, 121-122 trios, 123-144 corners, 145 basket, 146-156 lines
	function postBet(uint256[157] memory _bets) external payable {
		uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % 37;
		uint256 totalBetAmount = 0;

		for (uint256 i = 0; i < 157; i++) {
			totalBetAmount += _bets[i];
			if (_bets[i] == 0) {
				continue;
			}
			if (_bets[i] < minBet) {
				revert("Bet amount must be at least minBet");
			}
			if (_bets[i] > maxBet) {
				revert("Bet amount must be less than maxBetAmount");
			}
		}

		require(totalBetAmount > 0, "Must bet some Ether");
		require(msg.value == totalBetAmount, "Total bet amount must equal sent Ether");

		uint256 maxPayout = 0;
		for (uint256 n = 0; n < 37; n++) {
			uint256 payout = payoutForNumber(_bets, n);
			if (payout > maxPayout) {
				maxPayout = payout;
			}
		}
		require(address(this).balance >= maxPayout, "Table cannot cover this bet");

		uint256 winningAmount = payoutForNumber(_bets, randomNumber);
		if (winningAmount > 0) {
			payable(msg.sender).transfer(winningAmount);
		}

		emit WinningNumber(randomNumber, totalBetAmount, winningAmount, balances[msg.sender]);
	}

	function payoutForNumber(uint256[157] memory _bets, uint256 randomNumber) private pure returns (uint256 winningAmount) {
		winningAmount = _bets[randomNumber] * 36;
		if (randomNumber == 0) {
			winningAmount += _bets[106] * 18;
			winningAmount += _bets[107] * 18;
			winningAmount += _bets[108] * 18;
			winningAmount += _bets[121] * 12;
			winningAmount += _bets[122] * 12;
			winningAmount += _bets[145] * 9;
			return winningAmount;
		}
		if (((uint256(0x154aad52aa) >> randomNumber) & 1) == 1) {
			winningAmount += _bets[37] * 2;
		} else {
			winningAmount += _bets[38] * 2;
		}
		if (randomNumber % 2 == 0) {
			winningAmount += _bets[39] * 2;
		} else {
			winningAmount += _bets[40] * 2;
		}
		if (randomNumber <= 18) {
			winningAmount += _bets[41] * 2;
		} else {
			winningAmount += _bets[42] * 2;
		}
		if (randomNumber <= 12) {
			winningAmount += _bets[43] * 3;
		} else if (randomNumber <= 24) {
			winningAmount += _bets[44] * 3;
		} else {
			winningAmount += _bets[45] * 3;
		}
		uint256 col = randomNumber % 3;
		if (col == 0) {
			winningAmount += _bets[46] * 3;
		} else if (col == 2) {
			winningAmount += _bets[47] * 3;
		} else {
			winningAmount += _bets[48] * 3;
		}
		uint256 row = (randomNumber - 1) / 3;
		uint256 gridCol = 2 - ((randomNumber - 1) % 3);
		if (gridCol < 2) {
			winningAmount += _bets[49 + row * 2 + gridCol] * 18;
		}
		if (gridCol > 0) {
			winningAmount += _bets[49 + row * 2 + (gridCol - 1)] * 18;
		}
		if (row < 11) {
			winningAmount += _bets[73 + row * 3 + gridCol] * 18;
		}
		if (row > 0) {
			winningAmount += _bets[73 + (row - 1) * 3 + gridCol] * 18;
		}
		if (randomNumber <= 3) {
			winningAmount += _bets[106 + gridCol] * 18;
		}
		winningAmount += _bets[109 + row] * 12;
		if (randomNumber <= 2) {
			winningAmount += _bets[121] * 12;
		}
		if (randomNumber >= 2 && randomNumber <= 3) {
			winningAmount += _bets[122] * 12;
		}
		if (row < 11 && gridCol < 2) {
			winningAmount += _bets[123 + row * 2 + gridCol] * 9;
		}
		if (row < 11 && gridCol > 0) {
			winningAmount += _bets[123 + row * 2 + (gridCol - 1)] * 9;
		}
		if (row > 0 && gridCol < 2) {
			winningAmount += _bets[123 + (row - 1) * 2 + gridCol] * 9;
		}
		if (row > 0 && gridCol > 0) {
			winningAmount += _bets[123 + (row - 1) * 2 + (gridCol - 1)] * 9;
		}
		if (randomNumber <= 3) {
			winningAmount += _bets[145] * 9;
		}
		if (row < 11) {
			winningAmount += _bets[146 + row] * 6;
		}
		if (row > 0) {
			winningAmount += _bets[146 + (row - 1)] * 6;
		}
	}
}
