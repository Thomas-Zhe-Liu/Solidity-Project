pragma solidity ^0.4.11;

contract BetCollection {
    address private owner;

    mapping(uint => uint) betKeys;
    mapping(uint => Bet) bets;
    uint uIDCounter;

    struct Bet {
        uint uID;
        address bettor;
        string sportName;
        uint matchID;
        uint amount;
        bool forHome;
        uint timeOfBet;
        uint surcharge;
        uint refund;
        uint outcome;
    }

    constructor() public payable {
        owner = msg.sender;
    }

    function createBet(address bettor, string sportName, uint matchID, uint amount, bool forHome, uint surcharge, uint timestamp) public payable returns(uint) {
        require(owner == msg.sender);
        Bet memory b = Bet({
            uID: ++uIDCounter,
            bettor: bettor,
            sportName: sportName,
            matchID: matchID,
            amount: amount,
            forHome: forHome,
            timeOfBet: timestamp,
            surcharge: surcharge,
            refund: 0,
            outcome: 0
        });
        bets[uIDCounter] = b;
        betKeys[uIDCounter] = uIDCounter;
        return uIDCounter;
    }

    function swapTeamOfBet(uint uID, uint timestamp) public {
        require(owner == msg.sender);
        Bet storage b = bets[uID];
        b.forHome = !b.forHome;
        b.timeOfBet = timestamp;
        for (uint i = 1; i <= uIDCounter; i++) {
            if (betKeys[i] == uID) {
                for (uint j = i; j <= uIDCounter - 1; j++)
                    betKeys[j] = betKeys[j + 1];
                betKeys[uIDCounter] = uID;
                break;
            }
        }
    }

    function returnMoneyToEveryone(bool refundPaid) public {
        require(owner == msg.sender);
        for(uint i = 1; i <= uIDCounter; i++) {
            Bet storage b = bets[betKeys[i]];
            b.bettor.transfer(b.amount);
            b.outcome = b.amount;
            if(!refundPaid) {
                b.bettor.transfer(b.surcharge);
                b.refund = b.surcharge;
            }
        }
    }

    function distributeMoney(bool homeWins, uint awayTeamTotalBet, uint homeTeamTotalBet) public payable {
        require(owner == msg.sender);

        // Match storage m = matches[uID];
        // require(m.ended && !m.betDistributed);
        // for each bet
        for(uint i = 1; i <= uIDCounter; i++) {
            Bet storage b = bets[i];

            if(b.forHome == homeWins){
                uint _outcome = 0;
                if(b.forHome)
                    _outcome = b.amount + b.amount * awayTeamTotalBet / homeTeamTotalBet;
                else
                    _outcome = b.amount + b.amount * homeTeamTotalBet / awayTeamTotalBet;

                payOutcome(i, _outcome);
            }
        }
    }

    function distributeRefund(uint threshold) public payable {
        require(owner == msg.sender);
        uint cumulativeSum = 0;
        for(uint i = 1; i <= uIDCounter; i++) {
            Bet storage b = bets[betKeys[i]];
            uint _refund = 0;
            cumulativeSum += b.amount;

            if(cumulativeSum <= threshold) {
                _refund = b.surcharge * 2;
                payRefund(i, _refund);
            } else {
                if(b.amount + threshold > cumulativeSum) {
                    _refund = b.surcharge * (b.amount - (cumulativeSum - threshold)) / b.amount * 2;
                    payRefund(i, _refund);
                }
                break;
            }
        }
    }

    function payRefund(uint index, uint _amount) private {
        Bet storage b = bets[index];
        b.bettor.transfer(_amount);
        b.refund = _amount;
    }

    function payOutcome(uint index, uint _amount) private {
        Bet storage b = bets[index];
        b.bettor.transfer(_amount);
        b.outcome = _amount;
    }

    // GETTER


    function getSportName(uint index) public view returns(string) {
        require(owner == msg.sender);
        return bets[index].sportName;
    }

    function getBetInfo(uint index) public view returns(string, uint, uint, uint, bool, uint, uint, uint) {
        require(owner == msg.sender);
        Bet storage b = bets[index];
        return (b.sportName, b.matchID, b.amount, b.surcharge, b.forHome, b.timeOfBet, b.refund, b.outcome);
    }

    function getMatchID(uint index) public view returns(uint) {
        require(owner == msg.sender);
        return bets[index].matchID;
    }

    function getBettor(uint index) public view returns(address) {
        require(owner == msg.sender);
        return bets[index].bettor;
    }

    function getBetForHome(uint index) public view returns(bool) {
        require(owner == msg.sender);
        return bets[index].forHome;
    }

    function getBetAmount(uint index) public view returns(uint) {
        require(owner == msg.sender);
        return bets[index].amount;
    }

    function getBetSurcharge(uint index) public view returns(uint) {
        require(owner == msg.sender);
        return bets[index].surcharge;
    }
}
