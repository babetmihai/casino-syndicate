// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


struct Member {
	address sender;
	uint256 value;
}

contract Contract {
	Member[] public members;
	event Deposited(address indexed user, uint256 amount);
	event WinningNumber(uint256 number);

	address public owner;
	uint256 public maxBetAmount = 100;
	constructor() {
		owner = msg.sender;
	}


	function getBalance() external view returns (uint256) {
		return address(this).balance;
	}	

	function postMember() public payable {
		require(msg.value > 0, "Must send some Ether");
		// If the contract already has a balance, adjust member balances proportionally
		uint256 contractBalance = address(this).balance - msg.value;
		if (contractBalance > 0) {
			uint256 totalMemberBalance = 0;
			
			// Calculate total member balance
			for (uint256 i = 0; i < members.length; i++) {
				totalMemberBalance += members[i].value;
			}
			
			// Only adjust if there's a discrepancy and total member balance is not zero
			if (totalMemberBalance != contractBalance && totalMemberBalance > 0) {
				// Calculate the ratio for adjustment
				uint256 ratio = (contractBalance * 1e18) / totalMemberBalance;
				
				// Adjust each member's balance proportionally
				for (uint256 i = 0; i < members.length; i++) {
					members[i].value = (members[i].value * ratio) / 1e18;
				}
			}
		}
		members.push(Member({sender: msg.sender, value: msg.value}));
		emit Deposited(msg.sender, msg.value);
	}

	function getTable() external view returns (TableDTO memory) {
		uint256 balance = 0;
		for (uint256 i = 0; i < members.length; i++) {
			if (members[i].sender == msg.sender) {
				balance += members[i].value;
			}
		}

		return TableDTO({
			balance: balance
		});
	}

	function postBet(BetDTO[] memory _bets) external payable {
		require(msg.value > 0, "Must send some Ether");
		uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % 37;
		uint256 totalBetAmount = 0;
		uint256 winningAmount = 0;

		for (uint256 i = 0; i < _bets.length; i++) {
			if (_bets[i].amount > maxBetAmount) {
				revert("Bet amount must be less than maxBetAmount");
			}

			if (totalBetAmount + _bets[i].amount > msg.value) {
				revert("Total bet amount must equal sent Ether");
			}

			if (_bets[i].number == randomNumber) {
				totalBetAmount += _bets[i].amount;
				winningAmount += _bets[i].amount * 36;
			} 
		}

		if (winningAmount > 0) {
			payable(msg.sender).transfer(winningAmount);
		}
		
		emit WinningNumber(randomNumber);
	}
}


struct BetDTO {
	uint256 amount;
	uint256 number;
}

struct TableDTO {
	uint256 balance;
}