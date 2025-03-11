// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;




contract Contract {
	mapping(address => uint256) public members;
	mapping(address => uint256) public players;

	event Deposited(address indexed user, uint256 amount);

	address public owner;
	constructor() {
		owner = msg.sender;
	}


	function getBalance() external view returns (uint256) {
		return address(this).balance;
	}	

	function postMember() public payable {
		require(msg.value > 0, "Must send some Ether");
		members[msg.sender] += msg.value;
		emit Deposited(msg.sender, msg.value);
	}

	function postPlayer() external payable {
		require(msg.value > 0, "Must send some Ether");
		players[msg.sender] += msg.value;
		emit Deposited(msg.sender, msg.value);
	}

	function getTable() external view returns (TableDTO memory) {
		uint256 memberbalance = members[msg.sender];
		uint256 playerbalance = players[msg.sender];

		return TableDTO({
			memberbalance: memberbalance,
			playerbalance: playerbalance
		});
	}
}

struct TableDTO {
	uint256 memberbalance;
	uint256 playerbalance;
}