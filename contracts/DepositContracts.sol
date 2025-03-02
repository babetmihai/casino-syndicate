// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DepositContract {
	mapping(address => uint256) public balances;
	address public owner;

	event Deposited(address indexed user, uint256 amount);

	constructor() {
		owner = msg.sender;
		// Mappings are already initialized when declared, no need to create a new one
	}

	function deposit() external payable {
		require(msg.value > 0, "Must send some Ether");
		balances[msg.sender] += msg.value;
		emit Deposited(msg.sender, msg.value);
	}

	function getContractBalance() external view returns (uint256) {
		return address(this).balance;
	}


	struct UserBalance {
		uint256 balance;
		address userAddress;
	}
	
	function getContractBalances() external view returns (UserBalance memory) {
		return UserBalance({
			balance: balances[msg.sender] > 0 ? balances[msg.sender] : 0,
			userAddress: msg.sender
		});
	}
}