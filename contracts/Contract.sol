// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Types.sol";

contract Contract {
	uint256 public tableCount = 1;


	mapping(uint256 => mapping(address => TableMember)) public members; 
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

	function createTable(string memory _name) public payable {
		require(msg.value > 0, "Must send some Ether");
		uint256 tableId = tableCount++;

		Table memory table = Table({
			id: tableId,
			name: _name,
			createdBy: msg.sender,
			createdAt: block.timestamp,
			updatedAt: block.timestamp
		});

		tables[tableId] = table;


		TableMember memory member = TableMember({
			id: msg.sender,
			amount: msg.value,
			tableId: tableId,
			createdBy: msg.sender,
			createdAt: block.timestamp,
			updatedAt: block.timestamp
		});	

		members[tableId][msg.sender] = member;
	}

	function getTables() external view returns (Table[] memory) {
		Table[] memory _tables = new Table[](tableCount);
		for (uint256 i = 0; i < tableCount; i++) {
			_tables[i] = tables[i];
		}
		return _tables;
	}	

	function getTableInfo(uint256 _tableId) external view returns (TableInfoDTO memory) {
		Table memory table = tables[_tableId];
		TableMember memory member = members[_tableId][msg.sender];
		TableInfoDTO memory tableInfoDTO = TableInfoDTO({
			member: member,
			table: table
		});
		return tableInfoDTO;
	}
}

struct TableInfoDTO {
	TableMember member;
	Table table;
}

