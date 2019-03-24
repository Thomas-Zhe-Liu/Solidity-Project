pragma solidity ^0.4.11;

import "./Sport.sol";
import "./Bet.sol";

contract BettingPlatform {
    address private owner;

    address private sportCollection;
    mapping(address => BettorInfo) private bettorInfo;
    uint private surchargePercentage = 5;

    struct BettorInfo {
        uint numBets;
        mapping(uint => Bet) bets;
    }

    struct Bet {
        bytes32 sportID;
        uint matchID;
        uint betID;
    }

    event RequestUpdateMatch(string sportName, uint matchID);

    constructor() public {
        owner = msg.sender;
        sportCollection = new SportCollection();
    }

    function getSurchargePercentage() public view returns(uint) {
        return surchargePercentage;
    }

    function getSmartContractBalance() public view returns(uint) {
        return address(this).balance;
    }

    // MATCH ------------------------

    function getValidMatchIDs(string sportName) public view returns(uint[]) {
        SportCollection sc = SportCollection(sportCollection);
        return sc.getValidMatchIDs(keccak256(sportName));
    }

    // remove a specific match
    function deleteMatch(string sportName, uint matchID) public {
        require(owner == msg.sender);

        SportCollection sc = SportCollection(sportCollection);
        sc.deleteMatch(keccak256(sportName), matchID);
        emit RequestUpdateMatch(sportName, 0);
    }

    // add match, note that matche ids start at 1, not 0.
    function createMatch(string sportName, string homeTeam, string awayTeam, uint startTime, uint endTime) public {
        require(owner == msg.sender);

        SportCollection sc = SportCollection(sportCollection);
        sc.createMatch(keccak256(sportName), homeTeam, awayTeam, startTime, endTime);
        emit RequestUpdateMatch(sportName, 0);
    }

    // setters
    function updateMatch(string sportName, uint matchID, string homeTeam, string awayTeam, uint startTime, uint endTime, bool started, bool ended, bool homeWins) public {
        require(owner == msg.sender);

        SportCollection sc = SportCollection(sportCollection);
        sc.updateMatch(keccak256(sportName), matchID, homeTeam, awayTeam, startTime, endTime, started, ended, homeWins);
        emit RequestUpdateMatch(sportName, matchID);
    }

    // get match information

    function getMatchInfo(string sportName, uint matchID) public view returns (string, string, uint, uint, uint, uint) {
        SportCollection sc = SportCollection(sportCollection);
        return sc.getMatchInfo(keccak256(sportName), matchID);
    }

    function getMatchState(string sportName, uint matchID) public view returns (bool, bool, bool, bool, bool, bool){
        SportCollection sc = SportCollection(sportCollection);
        return sc.getMatchState(keccak256(sportName), matchID);
    }

    function hasPlacedBet(string sportName, uint matchID) public view returns(bool) {
        for(uint i = 0; i < bettorInfo[msg.sender].numBets; i++) {
            Bet storage bet = bettorInfo[msg.sender].bets[i];
            if(bet.sportID == keccak256(sportName) && bet.matchID == matchID) return true;
        }
        return false;
    }

    // BETS ------------------------
    function makeBet(string sportName, bool forHome, uint matchID, uint timestamp) public payable {
        SportCollection sc = SportCollection(sportCollection);

        //Take predefined percentage out of bet amount and make them to be the surchrage
        uint amount = msg.value * 100 / (100 + surchargePercentage);
        uint surcharge = msg.value - amount;
        bytes32 sportID = keccak256(sportName);
        uint betID = sc.addBet.value(msg.value)(matchID, msg.sender, sportName, amount, forHome, surcharge, timestamp);

        Bet memory bet = Bet({
            sportID: sportID,
            matchID: matchID,
            betID: betID
        });

        // add to the bettor
        bettorInfo[msg.sender].bets[bettorInfo[msg.sender].numBets++] = bet;
        emit RequestUpdateMatch(sportName, matchID);
    }

    function getBetInfo(uint betIndex) public view returns(string, uint, uint, uint, bool, uint, uint, uint) {
        Bet storage b = bettorInfo[msg.sender].bets[betIndex];
        SportCollection sc = SportCollection(sportCollection);
        return sc.getBetInfo(b.sportID, b.matchID, b.betID);
    }

    function getNumBets() public view returns(uint) {
        return bettorInfo[msg.sender].numBets;
    }

    function modifyBetAtIndex(uint betIndex, uint timestamp) public {
        require(betIndex >= 0 && betIndex < bettorInfo[msg.sender].numBets);

        Bet storage b = bettorInfo[msg.sender].bets[betIndex];
        SportCollection sc = SportCollection(sportCollection);
        sc.swapTeamOfBet(b.sportID, b.matchID, b.betID, timestamp);
        emit RequestUpdateMatch("", 0);
    }
}
