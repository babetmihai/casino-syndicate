// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Contract {
	uint256 public totalShares = 1;
	mapping(address => uint256) public shares;
	mapping(address => uint256) public balances;
	event Deposited(address indexed user, uint256 amount);
	event WinningNumber(uint256 number);

	address public owner;
	uint256 public maxBetAmount = 100;
	constructor() {
		owner = msg.sender;
	}

	
	function getTable() external view returns (TableDTO memory) {
		return TableDTO({
			memberShares: shares[msg.sender],
			playerBalance: balances[msg.sender],
			totalBalance: address(this).balance,
			totalShares: totalShares
		});
	}

	struct TableDTO {
		uint256 memberShares;
		uint256 playerBalance;
		uint256 totalShares;
		uint256 totalBalance;
	}

	function depositShares() public payable {
		require(msg.value > 0, "Must send some Ether");
    uint256 previousBalance = address(this).balance;
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

	function postBet(uint256[37] memory _bets) external {
		uint256 playerBalance = balances[msg.sender];
		uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % 37;
		uint256 totalBetAmount = 0;
		uint256 winningAmount = 0;

		for (uint256 i = 0; i < 37; i++) {
			if (_bets[i] > maxBetAmount) {
				revert("Bet amount must be less than maxBetAmount");
			}

			if (totalBetAmount + _bets[i] > playerBalance) {
				revert("Total bet amount must equal sent Ether");
			}

			if (_bets[i] == randomNumber) {
				totalBetAmount += _bets[i];
				winningAmount += _bets[i] * 36;
			} 
		}

		if (winningAmount > 0) {
			balances[msg.sender] += winningAmount;
		}
		
		emit WinningNumber(randomNumber);
	}
}


