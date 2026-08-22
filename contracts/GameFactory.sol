// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Roulette.sol";
import "./Polygons.sol";
import "./Blackjack.sol";


contract GameFactory {
	enum GameType {
		Roulette,
		Polygons,
		Blackjack
	}

	struct GameInfo {
		address game;
		address createdBy;
		GameType gameType;
		uint256 createdAt;
	}

	GameInfo[] public games;
	mapping(address => uint256[]) private gameIndexesByCreator;
	mapping(address => uint256) private gameIndexByAddress;
	mapping(address => address) public sessionOf;
	mapping(address => address) private sessionPrincipal;

	event GameCreated(
		address indexed game,
		address indexed createdBy,
		GameType gameType
	);
	event SessionAuthorized(address indexed account, address indexed session);

	function principalOf(address account) public view returns (address) {
		address owner = sessionPrincipal[account];
		if (owner != address(0)) {
			return owner;
		}
		return account;
	}

	function authorizeSession(address session) external payable {
		require(session != address(0), "Session required");
		require(session != msg.sender, "Not self");
		address current = sessionPrincipal[session];
		require(current == address(0) || current == msg.sender, "Session taken");
		address previous = sessionOf[msg.sender];
		if (previous != address(0) && previous != session) {
			delete sessionPrincipal[previous];
		}
		sessionOf[msg.sender] = session;
		sessionPrincipal[session] = msg.sender;
		if (msg.value > 0) {
			payable(session).transfer(msg.value);
		}
		emit SessionAuthorized(msg.sender, session);
	}

	function createGame(GameType gameType, uint256 a, uint256 b, uint256 c) external payable returns (address game) {
		address creator = principalOf(msg.sender);
		if (gameType == GameType.Roulette) {
			require(msg.value >= 1 ether, "Min deposit 1");
			game = address(new Roulette{value: msg.value}(creator, a, b));
		} else if (gameType == GameType.Polygons) {
			require(msg.value >= 1 ether, "Min deposit 1");
			game = address(new Polygons{value: msg.value}(creator, a, c));
		} else if (gameType == GameType.Blackjack) {
			require(msg.value >= 1 ether, "Min deposit 1");
			game = address(new Blackjack{value: msg.value}(creator, a, b));
		} else {
			revert("Unsupported game type");
		}
		require(game.balance == msg.value, "Funding failed");

		uint256 index = games.length;
		games.push(GameInfo({
			game: game,
			createdBy: creator,
			gameType: gameType,
			createdAt: block.timestamp
		}));
		gameIndexesByCreator[creator].push(index);
		gameIndexByAddress[game] = index + 1;
		emit GameCreated(game, creator, gameType);
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
