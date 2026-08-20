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
	mapping(address => mapping(address => uint256)) private creatorGameSlot;

	event GameCreated(
		address indexed game,
		address indexed createdBy,
		GameType gameType,
		string name
	);

	function createGame(string calldata name, GameType gameType, uint256 minBet, uint256 maxBet) external payable returns (address game) {
		require(msg.value >= 1 ether, "Min deposit 1");
		require(bytes(name).length > 0, "Name required");
		if (gameType == GameType.Roulette) {
			game = address(new Roulette{value: msg.value}(name, msg.sender, minBet, maxBet));
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
		creatorGameSlot[msg.sender][game] = gameIndexesByCreator[msg.sender].length;
		emit GameCreated(game, msg.sender, gameType, name);
	}

	function setGameOwner(address owner) external {
		require(owner != address(0), "Owner required");
		uint256 stored = gameIndexByAddress[msg.sender];
		require(stored > 0, "Unknown game");
		uint256 index = stored - 1;
		GameInfo storage info = games[index];
		address previous = info.createdBy;
		if (previous == owner) {
			return;
		}
		info.createdBy = owner;
		removeCreatorGame(previous, msg.sender);
		addCreatorGame(owner, msg.sender, index);
	}

	function setGameName(address game, string calldata name) external {
		uint256 stored = gameIndexByAddress[game];
		require(stored > 0, "Unknown game");
		GameInfo storage info = games[stored - 1];
		require(info.createdBy == msg.sender, "Only owner");
		require(bytes(name).length > 0, "Name required");
		info.name = name;
		Roulette(game).setName(name);
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

	function addCreatorGame(address creator, address game, uint256 index) private {
		uint256[] storage list = gameIndexesByCreator[creator];
		list.push(index);
		creatorGameSlot[creator][game] = list.length;
	}

	function removeCreatorGame(address creator, address game) private {
		uint256 slot = creatorGameSlot[creator][game];
		if (slot == 0) {
			return;
		}
		uint256[] storage list = gameIndexesByCreator[creator];
		uint256 lastPos = list.length - 1;
		if (slot - 1 != lastPos) {
			uint256 lastIndex = list[lastPos];
			list[slot - 1] = lastIndex;
			creatorGameSlot[creator][games[lastIndex].game] = slot;
		}
		list.pop();
		delete creatorGameSlot[creator][game];
	}
}
