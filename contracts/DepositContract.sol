// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;



contract DepositContract {
	
	struct UserBalance {
		uint256 balance;
		address userAddress;
	}

	mapping(address => uint256) public balances;
	address public owner;

	event Deposited(address indexed user, uint256 amount);

	constructor() {
		owner = msg.sender;
	}

	function deposit() external payable {
		require(msg.value > 0, "Must send some Ether");
		balances[msg.sender] += msg.value;
		emit Deposited(msg.sender, msg.value);
	}

	function getContractBalance() external view returns (uint256) {
		return address(this).balance;
	}


	
	function getContractBalances() external view returns (UserBalance memory) {
		uint256 balance = balances[msg.sender];
		return UserBalance({
			balance: balance > 0 ? balance : 0,
			userAddress: msg.sender
		});
	}
}
