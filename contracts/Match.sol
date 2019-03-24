pragma solidity ^0.4.11;

import "./Bet.sol";

contract MatchCollection {
    address private owner;

    mapping(uint => Match) private matches;
    uint private nMatches;

    struct Match {
        bool valid;
        uint uID;
        string homeTeam;
        string awayTeam;
        uint startTime;
        uint endTime;
        uint homeTeamTotalBet;
        uint awayTeamTotalBet;
        bool started;
        bool ended;
        bool homeWins;
        bool betDistributed;
        bool refundPaid;
        address betCollection;
        // Bet[] bets;
    }

    constructor() public {
        owner = msg.sender;
    }

    function createMatch(uint uID, string homeTeam, string awayTeam, uint startTime, uint endTime) public {
        require(owner == msg.sender);

        Match memory m = Match({
            valid: true,
            uID: uID,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            startTime: startTime,
            endTime: endTime,
            homeTeamTotalBet: 0,
            awayTeamTotalBet: 0,
            started: false,
            ended: false,
            homeWins: false,
            betDistributed: false,
            refundPaid: false,
            betCollection: new BetCollection()
        });
        nMatches++;
        matches[uID] = m;
    }

    function modifyMatch(uint uID, string homeTeam, string awayTeam, uint startTime, uint endTime, bool started, bool ended, bool homeWins) public {
        require(owner == msg.sender);
        require(matches[uID].valid);

        Match storage m = matches[uID];
        m.homeTeam = homeTeam;
        m.awayTeam = awayTeam;
        m.startTime = startTime;
        m.endTime = endTime;
        m.started = started;
        m.ended = ended;
        m.homeWins = homeWins;

        if(m.started && !m.refundPaid) {
            if (m.homeTeamTotalBet > 0 && m.awayTeamTotalBet > 0) distributeRefund(uID);
            else returnMoneyToEveryone(uID);
        }

        if(m.ended && !m.betDistributed)
            if (m.homeTeamTotalBet > 0 && m.awayTeamTotalBet > 0) distributeMoney(uID);
    }

    function swapTeamOfBet(uint uID, uint betUID, uint timestamp) public {
        require(owner == msg.sender);
        require(matches[uID].valid);
        Match storage m = matches[uID];
        require(!m.started && !m.ended);

        BetCollection bc = BetCollection(m.betCollection);

        uint amount = bc.getBetAmount(betUID);
        bool forHome = bc.getBetForHome(betUID);
        if(forHome) {
            m.homeTeamTotalBet -= amount;
            m.awayTeamTotalBet += amount;
        } else {
            m.homeTeamTotalBet += amount;
            m.awayTeamTotalBet -= amount;
        }

        bc.swapTeamOfBet(betUID, timestamp);
    }

    function addBet(uint uID, address bettor, string sportName, uint matchID, uint amount, bool forHome, uint surcharge, uint timestamp) public payable returns(uint) {
        require(owner == msg.sender);
        require(matches[uID].valid);
        Match storage m = matches[uID];
        BetCollection bc = BetCollection(m.betCollection);

        if(forHome) m.homeTeamTotalBet += amount;
        else m.awayTeamTotalBet += amount;

        return bc.createBet.value(msg.value)(bettor, sportName, matchID, amount, forHome, surcharge, timestamp);
    }

    function invalidate(uint uID) public {
        require(owner == msg.sender);
        require(matches[uID].valid);

        matches[uID].valid = false;
        returnMoneyToEveryone(uID);
        nMatches--;
    }

    function returnMoneyToEveryone(uint uID) private {
        Match storage m = matches[uID];
        BetCollection bc = BetCollection(m.betCollection);
        if(!m.betDistributed) {
            bc.returnMoneyToEveryone(m.refundPaid);
            m.refundPaid = true;
            m.betDistributed = true;
        }
    }

    function distributeMoney(uint uID) private {
        Match storage m = matches[uID];
        BetCollection bc = BetCollection(m.betCollection);
        require(m.ended && !m.betDistributed);
        bc.distributeMoney(m.homeWins, m.awayTeamTotalBet, m.homeTeamTotalBet);
        m.betDistributed = true;
    }

    // EBC FUNCTIONS
    function distributeRefund(uint uID) private {
        Match storage m = matches[uID];
        BetCollection bc = BetCollection(m.betCollection);
        require(m.started && !m.refundPaid);
        //get the total $ amount of bets
        uint threshold = (m.homeTeamTotalBet + m.awayTeamTotalBet) / 2;
        bc.distributeRefund(threshold);
        m.refundPaid = true;
    }

    // GETTER
    function isValid(uint uID) public view returns(bool) {
        require(owner == msg.sender);

        return matches[uID].valid;
    }

    function getMatchInfo(uint uID) public view returns (string, string, uint, uint, uint, uint) {
        require(owner == msg.sender);
        require(matches[uID].valid);

        Match storage m = matches[uID];
        return (m.homeTeam, m.awayTeam, m.startTime, m.endTime, m.homeTeamTotalBet, m.awayTeamTotalBet);
    }

    function getMatchState(uint uID) public view returns (bool, bool, bool, bool, bool, bool) {
        require(owner == msg.sender);

        Match storage m = matches[uID];
        return (m.started, m.ended, m.homeWins, m.betDistributed, m.refundPaid, m.valid);
    }

    function getBetInfo(uint uID, uint betID) public view returns(string, uint, uint, uint, bool, uint, uint, uint) {
        require(owner == msg.sender);

        Match storage m = matches[uID];
        return BetCollection(m.betCollection).getBetInfo(betID);
    }

    function getValidMatchIDs(uint max) public view returns(uint[]) {
        require(owner == msg.sender);

        uint[] memory validIDs = new uint[](nMatches);
        uint curr = 0;
        for(uint i = 1; i <= max; i++) {
            Match storage m = matches[i];
            if(m.valid) validIDs[curr++] = m.uID;
        }
        return validIDs;
    }
}
