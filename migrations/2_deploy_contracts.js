var BettingPlatform = artifacts.require("BettingPlatform");

module.exports = function(deployer) {
  deployer.deploy(BettingPlatform);
};