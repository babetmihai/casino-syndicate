// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Roulette.sol";


contract GameFactory {
	enum GameType {
		Roulette
	}

	struct GameInfo {
		address game;
		address createdBy;
		string name;
		GameType gameType;
		uint256 createdAt;
	}

	GameInfo[] public games;
	mapping(address => uint256[]) private gameIndexesByCreator;
	mapping(address => uint256) private gameIndexByAddress;

	event GameCreated(
		address indexed game,
		address indexed createdBy,
		GameType gameType,
		string name
	);

	function createGame(string calldata name, GameType gameType) external payable returns (address game) {
		require(msg.value > 0, "Must fund table");
		if (gameType == GameType.Roulette) {
			game = address(new Roulette{value: msg.value}(name, msg.sender));
		} else {
			revert("Unsupported game type");
		}
		require(game.balance == msg.value, "Funding failed");

		uint256 index = games.length;
		games.push(GameInfo({
			game: game,
			createdBy: msg.sender,
			name: name,
			gameType: gameType,
			createdAt: block.timestamp
		}));
		gameIndexesByCreator[msg.sender].push(index);
		gameIndexByAddress[game] = index + 1;
		emit GameCreated(game, msg.sender, gameType, name);
	}

	function getGame(address game) external view returns (GameInfo memory) {
		uint256 stored = gameIndexByAddress[game];
		require(stored > 0, "Unknown game");
		return games[stored - 1];
	}

	function getGamesByCreator(address creator) external view returns (GameInfo[] memory) {
		uint256[] storage indexes = gameIndexesByCreator[creator];
		GameInfo[] memory result = new GameInfo[](indexes.length);
		for (uint256 i = 0; i < indexes.length; i++) {
			result[i] = games[indexes[i]];
		}
		return result;
	}
}
