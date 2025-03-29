// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract Roulette {
  address public house; // The entity generating the random number
	bytes32 public commitment; // Hashed commitment of the random number
	uint256 public revealDeadline; // Deadline to reveal the number
	uint256 public randomNumber; // Revealed random number
	bool public isCommitted; // Tracks if commitment is made

	uint256 public totalShares = 0;
	mapping(address => uint256) public shares;
	mapping(address => uint256) public balances;
	
	address[] public currentPlayers;	
	mapping(address => uint256[37]) public currentPlayerBets;

	struct TableDTO {
		uint256 memberShares;
		uint256 playerBalance;
		uint256 totalShares;
		uint256 totalBalance;
	}

	event Committed(bytes32 commitment);
	event Revealed(uint256 randomNumber);
	event Deposited(address indexed user, uint256 amount);
	event WinningNumber(uint256 number, uint256 totalBetAmount, uint256 winningAmount, uint256 playerBalance);

	constructor(address _house) {
		house = _house;
		isCommitted = false;
		randomNumber = 0;
	}

	modifier onlyHouse() {
		require(msg.sender == house, "Only house can call this");
		_;
	}

	function getTable() public view returns (TableDTO memory) {
		return TableDTO({
			memberShares: shares[msg.sender],
			playerBalance: balances[msg.sender],
			totalBalance: address(this).balance,
			totalShares: totalShares
		});
	}

	function depositShares() public payable {
		require(msg.value > 0, "Must send some Ether");
    uint256 previousBalance = address(this).balance - msg.value;
    uint256 memberShares;

    if (previousBalance == 0) {
      memberShares = msg.value;
    } else {
			memberShares = (msg.value * totalShares) / previousBalance;
			require(memberShares > 0, "Share calculation resulted in zero");
    }

    totalShares += memberShares;
    shares[msg.sender] += memberShares;
    emit Deposited(msg.sender, msg.value);
	}

	function withdrawShares() external {
		require(shares[msg.sender] > 0, "Must have shares to withdraw");
		payable(msg.sender).transfer(shares[msg.sender]);
		totalShares -= shares[msg.sender];
		delete shares[msg.sender];
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

	// House commits to a hashed random number (e.g., keccak256(number + salt))
	function commit(bytes32 _commitment) external onlyHouse {
		require(!isCommitted, "Already committed");
		commitment = _commitment;
		isCommitted = true;
		emit Committed(_commitment);
	}

	// Set a reveal deadline (e.g., after some action like bets)
	function setRevealDeadline(uint256 _timeInSeconds) external onlyHouse {
		require(isCommitted, "Must commit first");
		require(revealDeadline == 0, "Deadline already set");
		revealDeadline = block.timestamp + _timeInSeconds;
	}

	function postBet(address account, uint256[37] memory _bets) external onlyHouse {
		uint256 playerBalance = balances[account];
		uint256 totalBetAmount = 0;
		uint256 maxBetAmount = 10 ether;

		for (uint256 i = 0; i < 37; i++) {
			totalBetAmount += _bets[i];
			if (_bets[i] > maxBetAmount) {
				revert("Bet amount must be less than maxBetAmount");
			}

			if (totalBetAmount > playerBalance) {
				revert("Total bet amount must equal sent Ether");
			}
		}

		currentPlayers.push(account);
		currentPlayerBets[account] = _bets;
	}

	// House reveals the random number and salt
	function reveal(uint256 _number, bytes32 _salt) external onlyHouse {
		require(isCommitted, "Must commit first");
		require(randomNumber == 0, "Already revealed");
		require(block.timestamp <= revealDeadline, "Reveal deadline passed");

		// Verify the commitment matches the revealed number and salt
		bytes32 hash = keccak256(abi.encodePacked(_number, _salt));
		require(hash == commitment, "Invalid reveal");

		randomNumber = uint256(keccak256(abi.encodePacked(_number, block.timestamp, block.prevrandao))) % 37;
		for (uint256 i = 0; i < currentPlayers.length; i++) {
			address account = currentPlayers[i];
			uint256[37] memory bets = currentPlayerBets[account];

			uint256 totalBetAmount = 0;
			for (uint256 j = 0; j < 37; j++) {
				totalBetAmount += bets[j];
			}
			
			balances[account] -= totalBetAmount;
			if (bets[randomNumber] > 0) {
				balances[account] += bets[randomNumber] * 36;
			}	
		}

		for (uint256 i = 0; i < currentPlayers.length; i++) {
			delete currentPlayerBets[currentPlayers[i]];
		}
		currentPlayers = new address[](0);

		emit Revealed(randomNumber);
	}
}


