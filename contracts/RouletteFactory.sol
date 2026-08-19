// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Roulette.sol";


contract RouletteFactory {
	struct TableInfo {
		address table;
		address createdBy;
		string name;
		uint256 createdAt;
	}

	TableInfo[] public tables;
	mapping(address => uint256[]) private tableIndexesByCreator;

	event TableCreated(address indexed table, address indexed createdBy, string name);

	function createTable(string calldata name) external returns (address table) {
		Roulette roulette = new Roulette(name, msg.sender);
		table = address(roulette);
		uint256 index = tables.length;
		tables.push(TableInfo({
			table: table,
			createdBy: msg.sender,
			name: name,
			createdAt: block.timestamp
		}));
		tableIndexesByCreator[msg.sender].push(index);
		emit TableCreated(table, msg.sender, name);
	}

	function getTablesByCreator(address creator) external view returns (TableInfo[] memory) {
		uint256[] storage indexes = tableIndexesByCreator[creator];
		TableInfo[] memory result = new TableInfo[](indexes.length);
		for (uint256 i = 0; i < indexes.length; i++) {
			result[i] = tables[indexes[i]];
		}
		return result;
	}
}
