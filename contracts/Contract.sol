// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;



contract Contract {
	uint256 public tableCount;
	struct Table {
		uint256 id;
		string name;
		address owner;
		uint256 balance;
		uint256 createdAt;
		uint256 updatedAt;

	}

	mapping(uint256 => Table) public tables;

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

	function createTable(string memory _name) external payable {
		require(msg.value > 0, "Must send some Ether");
		uint256 tableId = tableCount++;
		Table memory table = Table({
			id: tableId,
			name: _name,
			balance: msg.value,
			owner: msg.sender,
			createdAt: block.timestamp,
			updatedAt: block.timestamp
		});
		tables[tableId] = table;
	}

	function getTableNames() external view returns (string[] memory) {
		string[] memory tableNames = new string[](tableCount);
		for (uint256 i = 0; i < tableCount; i++) {
			tableNames[i] = tables[i].name;
		}
		return tableNames;
	}
}
