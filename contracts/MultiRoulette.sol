// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MultiRoulette {
    // Structure to represent an investor's stake
    struct Investor {
        address investorAddress;
        uint investment;       // Amount invested (in wei)
    }

    // Structure to represent a single roulette table
    struct RouletteTable {
        uint tableId;              // Unique ID for the table
        address owner;             // Primary owner of the table
        Investor[] investors;      // List of investors and their stakes
        uint totalInvestment;      // Total amount invested by owner + investors
        address[] players;         // List of players
        mapping(address => uint) bets; // Bets placed by each player (in wei)
        bool isActive;             // Whether the table is still open for bets
        uint result;               // Winning number (0-36, set after spin)
        uint firstBetTime;         // Timestamp of the first bet
        uint spinDelay;            // Time (in seconds) after first bet to auto-spin
    }

    // Mapping to store all roulette tables by their ID
    mapping(uint => RouletteTable) public tables;

    // Counter for table IDs
    uint public nextTableId;

    // Events for tracking actions
    event TableCreated(uint tableId, address owner, uint spinDelay);
    event InvestorAdded(uint tableId, address investor, uint investment);
    event PlayerJoined(uint tableId, address player, uint bet);
    event TableSpun(uint tableId, uint result);
    event ProfitsDistributed(uint tableId, uint totalProfit);

    constructor() {
        nextTableId = 1;
    }

    // Create a new roulette table with initial investment from the owner
    function createTable(uint _spinDelay) external payable {
        require(_spinDelay > 0, "Spin delay must be greater than 0");
        require(msg.value > 0, "Owner must invest some Ether");

        RouletteTable storage newTable = tables[nextTableId];
        newTable.tableId = nextTableId;
        newTable.owner = msg.sender;
        newTable.totalInvestment = msg.value;
        newTable.investors.push(Investor(msg.sender, msg.value)); // Owner is first investor
        newTable.isActive = true;
        newTable.result = 0;
        newTable.firstBetTime = 0;
        newTable.spinDelay = _spinDelay;

        emit TableCreated(nextTableId, msg.sender, _spinDelay);
        nextTableId++;
    }

    // Allow investors to join a table with an investment
    function investInTable(uint _tableId) external payable {
        RouletteTable storage table = tables[_tableId];
        require(table.tableId != 0, "Table does not exist");
        require(table.isActive, "Table is not active");
        require(msg.value > 0, "Must invest some Ether");

        // Add investor if they haven’t invested yet
        bool isNewInvestor = true;
        for (uint i = 0; i < table.investors.length; i++) {
            if (table.investors[i].investorAddress == msg.sender) {
                table.investors[i].investment += msg.value;
                isNewInvestor = false;
                break;
            }
        }
        if (isNewInvestor) {
            table.investors.push(Investor(msg.sender, msg.value));
        }

        table.totalInvestment += msg.value;
        emit InvestorAdded(_tableId, msg.sender, msg.value);
    }

    // Join a table by depositing Ether as a bet
    function joinTable(uint _tableId) external payable {
        RouletteTable storage table = tables[_tableId];
        
        require(table.tableId != 0, "Table does not exist");
        require(table.isActive, "Table is not active");
        require(msg.value > 0, "Must deposit Ether to join");

        // Check if spin time has elapsed (auto-spin if so)
        if (table.firstBetTime > 0 && block.timestamp >= table.firstBetTime + table.spinDelay) {
            spinTable(_tableId);
            revert("Table has spun, no more bets allowed");
        }

        // If this is the first bet, record the timestamp
        if (table.players.length == 0) {
            table.firstBetTime = block.timestamp;
        }

        // Add player if they haven’t joined yet
        if (table.bets[msg.sender] == 0) {
            table.players.push(msg.sender);
        }

        // Record the player's bet (cumulative)
        table.bets[msg.sender] += msg.value;

        emit PlayerJoined(_tableId, msg.sender, msg.value);
    }

    // Anyone can call this to spin the table and distribute profits
    function spinTable(uint _tableId) public {
        RouletteTable storage table = tables[_tableId];
        
        require(table.tableId != 0, "Table does not exist");
        require(table.isActive, "Table already spun");
        require(table.firstBetTime > 0, "No bets placed yet");
        require(block.timestamp >= table.firstBetTime + table.spinDelay, "Spin time not reached");

        // Placeholder randomness (insecure, for demo only)
        table.result = uint(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % 37;
        table.isActive = false;

        emit TableSpun(_tableId, table.result);

        // Distribute profits (simplified: all bets lost, house takes all)
        uint totalBets = 0;
        for (uint i = 0; i < table.players.length; i++) {
            totalBets += table.bets[table.players[i]];
        }

        // For demo, assume house wins all bets (expand with real payout logic)
        uint totalProfit = totalBets;
        if (totalProfit > 0) {
            for (uint i = 0; i < table.investors.length; i++) {
                Investor storage investor = table.investors[i];
                uint profitShare = (totalProfit * investor.investment) / table.totalInvestment;
                payable(investor.investorAddress).transfer(profitShare);
            }
            emit ProfitsDistributed(_tableId, totalProfit);
        }
    }

    // Get table details (for frontend use)
    function getTableDetails(uint _tableId) external view returns (
        uint tableId,
        address owner,
        Investor[] memory investors,
        uint totalInvestment,
        address[] memory players,
        bool isActive,
        uint result,
        uint firstBetTime,
        uint spinDelay
    ) {
        RouletteTable storage table = tables[_tableId];
        require(table.tableId != 0, "Table does not exist");
        return (
            table.tableId,
            table.owner,
            table.investors,
            table.totalInvestment,
            table.players,
            table.isActive,
            table.result,
            table.firstBetTime,
            table.spinDelay
        );
    }

    // Get a player's bet on a specific table
    function getPlayerBet(uint _tableId, address _player) external view returns (uint) {
        RouletteTable storage table = tables[_tableId];
        require(table.tableId != 0, "Table does not exist");
        return table.bets[_player];
    }

    // Placeholder: Withdraw winnings (to be expanded)
    function withdrawWinnings(uint _tableId) external {
        RouletteTable storage table = tables[_tableId];
        require(table.tableId != 0, "Table does not exist");
        require(!table.isActive, "Table still active");
        
        uint bet = table.bets[msg.sender];
        require(bet > 0, "No bet placed");

        // Simplified payout logic (e.g., win if result is even)
        if (table.result % 2 == 0) { // Example: even numbers win
            uint payout = bet * 2;  // 2x payout for demo
            table.bets[msg.sender] = 0; // Clear bet
            payable(msg.sender).transfer(payout);
        } else {
            table.bets[msg.sender] = 0; // Clear bet, no payout
        }
    }

    // Allow contract to receive Ether
    receive() external payable {}
}