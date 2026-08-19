// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract Roulette {
	string public name;
	address public createdBy;
	uint256 public createdAt;

	uint256 public totalShares = 0;
	mapping(address => uint256) public shares;
	mapping(address => uint256) public balances;

	struct TableDTO {
		uint256 memberShares;
		uint256 playerBalance;
		uint256 totalShares;
		uint256 totalBalance;
	}

	event Deposited(address indexed user, uint256 amount);
	event WinningNumber(uint256 number, uint256 totalBetAmount, uint256 winningAmount, uint256 playerBalance);

	constructor(string memory _name, address _createdBy) payable {
		name = _name;
		createdBy = _createdBy;
		createdAt = block.timestamp;
		if (msg.value > 0) {
			totalShares = msg.value;
			shares[_createdBy] = msg.value;
			emit Deposited(_createdBy, msg.value);
		}
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
			totalBalance: bankroll
		});
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

	function postBet(uint256[37] memory _bets) external payable {
		uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % 37;
		uint256 totalBetAmount = 0;
		uint256 winningAmount = 0;
		uint256 maxBetAmount = 100 ether;

		for (uint256 i = 0; i < 37; i++) {
			totalBetAmount += _bets[i];
			if (_bets[i] > maxBetAmount) {
				revert("Bet amount must be less than maxBetAmount");
			}
		}

		require(totalBetAmount > 0, "Must bet some Ether");
		require(msg.value == totalBetAmount, "Total bet amount must equal sent Ether");

		if (_bets[randomNumber] > 0) {
			winningAmount = _bets[randomNumber] * 36;
			require(address(this).balance >= winningAmount, "Table cannot cover this win");
			payable(msg.sender).transfer(winningAmount);
		}

		emit WinningNumber(randomNumber, totalBetAmount, winningAmount, balances[msg.sender]);
	}
}
