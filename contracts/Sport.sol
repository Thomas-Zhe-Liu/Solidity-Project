pragma solidity ^0.4.11;

import "./Match.sol";

contract SportCollection {
    address private owner;

    mapping(bytes32 => Sport) private sports;

    struct Sport {
        address matchCollection;
        uint uIDCounter;
    }

    constructor() public {
        owner = msg.sender;
    }

    // add a match
    function createMatch(bytes32 sportID, string homeTeam, string awayTeam, uint startTime, uint endTime) public {
        require(owner == msg.sender);

        // check if the sport exists
        if(sports[sportID].matchCollection == 0) {
            // since it doesn't exist, create a new sport and add it
            sports[sportID] = Sport({
                matchCollection: new MatchCollection(),
                uIDCounter: 1
            });
        }

        MatchCollection mc = MatchCollection(sports[sportID].matchCollection);
        mc.createMatch(sports[sportID].uIDCounter++, homeTeam, awayTeam, startTime, endTime);
    }

    function deleteMatch(bytes32 sportID, uint matchID) public {
        require(owner == msg.sender);
        require(sports[sportID].matchCollection != 0);
        MatchCollection mc = MatchCollection(sports[sportID].matchCollection);
        mc.invalidate(matchID);
    }

    function updateMatch(bytes32 sportID, uint matchID, string homeTeam, string awayTeam, uint startTime, uint endTime, bool started, bool ended, bool homeWins) public {
        require(owner == msg.sender);
        require(sports[sportID].matchCollection != 0);
        MatchCollection mc = MatchCollection(sports[sportID].matchCollection);
        mc.modifyMatch(matchID, homeTeam, awayTeam, startTime, endTime, started, ended, homeWins);
    }

    function swapTeamOfBet(bytes32 sportID, uint matchID, uint betUID, uint timestamp) public {
        require(owner == msg.sender);

        MatchCollection mc = MatchCollection(sports[sportID].matchCollection);
        mc.swapTeamOfBet(matchID, betUID, timestamp);
    }

    function addBet(uint matchID, address bettor, string sportName, uint amount, bool forHome, uint surcharge, uint timestamp) public payable returns(uint) {
        require(owner == msg.sender);
        bytes32 sportID = keccak256(sportName);
        require(sports[sportID].matchCollection != 0);
        MatchCollection mc = MatchCollection(sports[sportID].matchCollection);
        return mc.addBet.value(msg.value)(matchID, bettor, sportName, matchID, amount, forHome, surcharge, timestamp);
    }

    // GETTER:
    // match information
    function getMatchInfo(bytes32 sportID, uint matchID) public view returns (string, string, uint, uint, uint, uint) {
        require(owner == msg.sender);

        MatchCollection mc = MatchCollection(sports[sportID].matchCollection);
        return mc.getMatchInfo(matchID);
    }

    // returns empty array of uints
    function getValidMatchIDs(bytes32 sportID) public view returns(uint[]) {
        require(owner == msg.sender);
        if (sports[sportID].matchCollection == 0) return new uint[](0);
        MatchCollection mc = MatchCollection(sports[sportID].matchCollection);
        return mc.getValidMatchIDs(sports[sportID].uIDCounter);
    }

    function getMatchState(bytes32 sportID, uint matchID) public view returns (bool, bool, bool, bool, bool, bool) {
        require(owner == msg.sender);

        MatchCollection mc = MatchCollection(sports[sportID].matchCollection);
        return mc.getMatchState(matchID);
    }

    function getBetInfo(bytes32 sportID, uint matchID, uint betID) public view returns(string, uint, uint, uint, bool, uint, uint, uint) {
        require(owner == msg.sender);

        MatchCollection mc = MatchCollection(sports[sportID].matchCollection);
        return mc.getBetInfo(matchID, betID);
    }
}
