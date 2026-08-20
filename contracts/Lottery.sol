// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract Lottery {
	string public name;
	address public createdBy;
	address public factory;
	uint256 public createdAt;

	uint256 public polygonCount;
	uint256 public winPercent;
	uint256 public ticketPrice;
	uint256 public claimedCount;
	uint256 public reserved;

	mapping(uint256 => address) public polygonOwner;
	mapping(address => uint256) public prizes;
	address[] private lastOwners;
	uint256 private lastPrize;

	uint256 public constant MIN_POLYGONS = 3;
	uint256 public constant MAX_POLYGONS = 48;
	uint256 public constant CHIP = 0.01 ether;
	uint256 public constant PERCENT_SCALE = 10000;

	uint256 private nonce;

	struct TableDTO {
		uint256 polygonCount;
		uint256 winPercent;
		uint256 ticketPrice;
		uint256 claimedCount;
		uint256 prize;
		uint256 myPrize;
		address owner;
		address[] owners;
	}

	event TicketBought(address indexed player, bool won, uint256 polygonId, bool assigned);
	event TicketsRefunded(address indexed player, uint256 count, uint256 amount);
	event PrizePaid(address indexed player, uint256 amount);
	event Settled(uint256 prize, address[] owners);

	constructor(
		string memory _name,
		address _createdBy,
		uint256 _polygonCount,
		uint256 _winPercent,
		uint256 _ticketPrice
	) payable {
		require(bytes(_name).length > 0, "Name required");
		require(_polygonCount >= MIN_POLYGONS && _polygonCount <= MAX_POLYGONS, "Bad polygons");
		require(_winPercent >= 1 && _winPercent <= PERCENT_SCALE, "Bad percent");
		require(_ticketPrice >= CHIP, "Price too small");
		name = _name;
		createdBy = _createdBy;
		factory = msg.sender;
		createdAt = block.timestamp;
		polygonCount = _polygonCount;
		winPercent = _winPercent;
		ticketPrice = _ticketPrice;
	}

	function getTable() public view returns (TableDTO memory) {
		bool holding = prizes[msg.sender] > 0 && lastOwners.length == polygonCount;
		address[] memory owners = new address[](polygonCount);
		uint256 shownClaimed = claimedCount;
		uint256 pot = address(this).balance - reserved;
		for (uint256 i = 0; i < polygonCount; i++) {
			if (holding) {
				owners[i] = lastOwners[i];
			} else {
				owners[i] = polygonOwner[i];
			}
		}
		if (holding) {
			shownClaimed = polygonCount;
			pot = lastPrize;
		}
		return TableDTO({
			polygonCount: polygonCount,
			winPercent: winPercent,
			ticketPrice: ticketPrice,
			claimedCount: shownClaimed,
			prize: pot,
			myPrize: prizes[msg.sender],
			owner: createdBy,
			owners: owners
		});
	}

	function setName(string calldata _name) external {
		require(msg.sender == createdBy || msg.sender == factory, "Only owner");
		require(bytes(_name).length > 0, "Name required");
		name = _name;
	}

	function withdrawPrize() external {
		uint256 amount = prizes[msg.sender];
		require(amount > 0, "No prize");
		prizes[msg.sender] = 0;
		reserved -= amount;
		emit PrizePaid(msg.sender, amount);
		payable(msg.sender).transfer(amount);
	}

	function buyTicket() external payable {
		drawTickets(1);
	}

	function buyTickets(uint256 count) external payable {
		drawTickets(count);
	}

	function drawTickets(uint256 count) private {
		require(prizes[msg.sender] == 0, "Claim first");
		require(count == 1 || count == 5 || count == 10 || count == 25, "Bad count");
		require(msg.value == ticketPrice * count, "Wrong price");
		uint256 used = 0;
		bool filled = false;
		for (; used < count; used++) {
			filled = drawTicket();
			if (filled) {
				used++;
				break;
			}
		}
		uint256 leftover = count - used;
		uint256 refund = ticketPrice * leftover;
		if (filled) {
			settle(refund);
		}
		if (refund > 0) {
			emit TicketsRefunded(msg.sender, leftover, refund);
			payable(msg.sender).transfer(refund);
		}
	}

	function drawTicket() private returns (bool filled) {
		uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender, nonce)));
		nonce++;
		bool won = (seed % PERCENT_SCALE) < winPercent;
		if (!won) {
			emit TicketBought(msg.sender, false, 0, false);
			return false;
		}

		uint256 polygonId = uint256(keccak256(abi.encodePacked(seed, uint256(1)))) % polygonCount;
		if (polygonOwner[polygonId] != address(0)) {
			emit TicketBought(msg.sender, true, polygonId, false);
			return false;
		}

		polygonOwner[polygonId] = msg.sender;
		claimedCount++;
		emit TicketBought(msg.sender, true, polygonId, true);
		return claimedCount == polygonCount;
	}

	function settle(uint256 refund) private {
		uint256 pot = address(this).balance - reserved - refund;
		uint256 unit = pot / polygonCount;
		uint256 remainder = pot % polygonCount;
		address last = polygonOwner[polygonCount - 1];
		address[] memory roundOwners = new address[](polygonCount);
		for (uint256 i = 0; i < polygonCount; i++) {
			roundOwners[i] = polygonOwner[i];
			prizes[polygonOwner[i]] += unit;
			delete polygonOwner[i];
		}
		prizes[last] += remainder;
		reserved += pot;
		claimedCount = 0;
		lastOwners = roundOwners;
		lastPrize = pot;
		emit Settled(pot, roundOwners);
	}
}
