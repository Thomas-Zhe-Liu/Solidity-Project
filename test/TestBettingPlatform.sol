pragma solidity ^0.4.11;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/BettingPlatform.sol";

contract TestBettingPlatform {
    // uint public initialBalance = 10 ether;

    function testGetSurchargePercentage() public {
        BettingPlatform BP = BettingPlatform(DeployedAddresses.BettingPlatform());

        Assert.equal(BP.getSurchargePercentage(), 5, "Surcharge rate check");
    }

    function testGetSmartContractBalance() public {
        BettingPlatform BP = BettingPlatform(DeployedAddresses.BettingPlatform());
        
        Assert.equal(BP.getSmartContractBalance(), 0, "Initial balance check");
    }

    function testMatch() public {
        BettingPlatform BP = BettingPlatform(DeployedAddresses.BettingPlatform());
        string memory sportName = "BasketBall";
        string memory homeTeam = "homeTeam";
        string memory awayTeam = "awayTeam";
        uint startTime = 0;
        uint endTime = 1;

        // initial state tests
        // getNumMatches
        Assert.equal(BP.getNumMatches(sportName), 0, "Initial match number check");

        // getNumMatches
        uint v0;
        uint v1;
        (v0, v1) = BP.getNextMatchID(sportName, 0);
        Assert.equal(v0, 0, "Get matchID check");
        Assert.equal(v1, 0, "Get nextMatchIndex check");

        // create and test
        // THIS DOESN'T WORK!!!!
        BP.createMatch(sportName, homeTeam, awayTeam, startTime, endTime);
        Assert.equal(BP.getNumMatches(sportName), 1, "Number of matches check after createMatch");

        // (v0, v1) = BP.getNextMatchID(sportName, 1);
        // Assert.equal(v0, 0, "Get matchID check after createMatch");
        // Assert.equal(v1, 0, "Get nextMatchIndex check after createMatch");

    }

    // Failure Expected

    // function testGetSmartContractBalanceFail() public {
    //     Assert.equal(BettingPlatform(BP).getSmartContractBalance(), 1, "");
    // }

}
