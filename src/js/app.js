App = {
  web3Provider: null,
  contracts: {},

  init: function () {

    return App.initWeb3();
  },

  // Initial web3
  initWeb3: function () {
    // Is there an injected web3 instance?
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
    } else {
      // If no injected web3 instance is detected, fall back to Ganache
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  // Initial smart contract
  initContract: async function () {
    await $.getJSON('BettingPlatform.json').then(function (data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var BettingPlatformArtifact = data;
      App.contracts.BettingPlatform = TruffleContract(BettingPlatformArtifact);

      // Set the provider for our contract
      App.contracts.BettingPlatform.setProvider(App.web3Provider);

      // refresh the wallet information of the current user account
      refreshWallet();
      // Available sports are store in a JSON file
      $.getJSON('../sports.json', function (data) {
        for (let i = 0; i < data.length; i++) {
          let sportName = data[i].name;
          let active = '';
          // Select the first sport as default
          if (i == 0) active = 'active';
          // Load template file to construct the navigation bar
          $.get('templates/navItemTemplate.html', function (template) {
            $.tmpl(template, {
              active: active,
              sportName: sportName
            }).appendTo('#sportsNav');
          });
        }
        // if (data.length > 0) refreshSport(data[0].name);
      });

      // Binding update events from smart contract
      latestBlock = 0;

      App.contracts.BettingPlatform.deployed().then(function (instance) {
        BPInstance = instance;

        BPInstance.RequestUpdateMatch({ fromBlock: 'latest' }, function (error, result) {
          if (!error) {
            // Ignore duplicate request
            if (latestBlock == result.blockNumber)
              return;
            latestBlock = result.blockNumber;

            var sportName = getSportName();
            // Only update when the requested sport is the same as the current sport
            if (sportName == result.args['sportName'])
              if (result.args['matchID'] == 0)
                refreshSport(sportName);
              else
                refreshMatch(result.args['matchID']);
            // Currently in profile page
            if (sportName == '')
              showProfilePage(null);
          }
        });
      });
    });

    return App.bindEvents();
  },

  // Binding events
  bindEvents: function () {
    $(document).on('click', '.sportName', refreshSportPage);
    $(document).on('click', '.btn-modal', refreshStatChart);
    $(document).on('click', '.btn-bet', makeBetHandler);
    $(document).on('click', '#profile-dropdown', refreshWallet);
    $(document).on('click', '.btn-display-bet-page', showBetPage);
    $(document).on('click', '.show-profile', showProfilePage);
    $(document).on('click', '.switch-bet', switchBetHandler);
    $(document).on('change', '.game-filter', statusFiltering);
    $(document).on('keyup', '.search-id', IDFiltering);
  },
};


$(function () {
  $(window).load(function () {
    App.init();
  });
});

$(document).ready(function () {
  $('[data-toggle="tooltip"]').tooltip();
});

/**
 * Validate the inputs: only accept positive numbers
 * 
 * @param event: the input event of the components
 */
function validate(event) {
  var thisEvent = event || window.event;
  var key = thisEvent.keyCode || thisEvent.which;
  var regex = /[\d\.]/;
  var objRegex = /^\d*[\.]?\d*$/;
  var val = $(event.target).val();

  key = String.fromCharCode(key);
  if (!regex.test(key)
    || !objRegex.test(val + key)
    || !thisEvent.keyCode == 46 //delete
    || !thisEvent.keyCode == 8) //backspace
  {
    thisEvent.returnValue = false;
    if (thisEvent.preventDefault)
      thisEvent.preventDefault();
  }
}

/**
 * Get the selecting sport name
 * 
 * @returns the selecting sport name
 */
function getSportName() {
  return $('.sportBlock.active').find('.sportName').text();
}

/**
 * Refresh the user account information (the wallet address and balance)
 * 
 * @param event: click event
 */
function refreshWallet(event) {
  web3.eth.getAccounts(function (error, accounts) {
    var wallet = $('#wallet-address');
    var wallet_balance = $('#wallet-balance');

    if (error) {
      alert(err.message);
      wallet.text("Invalid");
      wallet_balance.text('Invalid');
    }
    else {
      if (accounts.length > 0) {
        var account = accounts[0];
        wallet.text(account);
        wallet.attr('title', account);

        web3.eth.getBalance(account, function (error, balance) {
          if (error) {
            alert(err.message);
            wallet_balance.text('Invalid');
          }
          wallet_balance.text(web3.fromWei(balance, 'ether').toString() + ' ETC');
          wallet_balance.attr('title', web3.fromWei(balance, 'ether').toString() + ' ETC');
        });
      }
      else {
        wallet.text("Invalid");
        wallet_balance.text('Invalid');
      }
    }
  });
}

/**
 * Refresh the matches of the selecting sport
 * 
 * @param event: the click event
 */
function refreshSportPage(event) {
  // Switch the navigation bar active item
  $('.sportBlock').removeClass('active');
  $(event.target).parent().addClass('active');
  // flag that decide if the match status filtering option "bet placed"
  // is displayed or not
  $('#bet-placed-option').show();
  refreshSport(event.target.text);
}

/**
 * Fetch and display matches of the selecting sport
 * 
 * @param {string} sportName: the sport name to be displayed
 */
function refreshSport(sportName) {

  App.contracts.BettingPlatform.deployed().then(function (instance) {
    BPInstance = instance;

    BPInstance.getValidMatchIDs(sportName).then(function (result) {
      let nMatches = result.length;
      let gamesRow = $('#gamesRow');
      gamesRow.empty();
      $('#betTable').hide();

      let matchIndex = 0;
      let validIDs = result.sort();
      for (let i = 0; i < nMatches; i++) {
        let matchID = validIDs[i];

        $.get('templates/matchItemTemplate.html', function (template) {
          $.tmpl(template, {
            matchID: matchID
          }).appendTo('#gamesRow');
          refreshMatch(matchID);
        });
      }
    }).catch(function (err) {
      alert(err.message);
    });
  });
}
/**
 * Refresh the match of the given ID
 * 
 * @param {int} matchID: the ID of the match to be refreshed
 */
function refreshMatch(matchID) {
  web3.eth.getAccounts(function (error, accounts) {
    if (error) {
      alert(err.message);
    }

    var account = accounts[0];
    App.contracts.BettingPlatform.deployed().then(async function (instance) {
      BPInstance = instance;

      // The card of the selecting match
      let card = $('.panel-game[data-id=' + matchID + ']');
      // The selecting sport
      let sportName = getSportName();
      // Initial the data of updates
      let data = {
        matchID: matchID,
        status: 'Available',
        bgColor: 'bg-success',
        betBtnStyle: 'btn-outline-success',
        betBtnDisable: 'btn-display-bet-page'
      }

      await (
        BPInstance.getSurchargePercentage().then(function (result) {
          data.surchargePercentage = web3.toDecimal(result)
        })
        ,
        BPInstance.hasPlacedBet(sportName, matchID, { from: account })
          .then(function (result) {
            var betPlaced = result;
            if (betPlaced) {
              data.status = 'Bet Placed';
              data.bgColor = 'bg-warning';
            }
          }).catch(function (err) {
            alert(err.message);
          })
        ,
        // Get other information of the match
        BPInstance.getMatchInfo(sportName, matchID, { from: account })
          .then(function (result) {
            var startTime = new Date(parseInt(result[2]));
            var startTimeISO = new Date(startTime.getTime() - (startTime.getTimezoneOffset() * 60000)).toISOString().substr(0, 16);
            var endTime = new Date(parseInt(result[3]));
            var endTimeISO = new Date(endTime.getTime() - (endTime.getTimezoneOffset() * 60000)).toISOString().substr(0, 16);
            var homeName = result[0];
            var awayName = result[1];
            var homeTotalBets = web3.fromWei(result[4]);
            var awayTotalBets = web3.fromWei(result[5]);
            var homeOdds = 0.0;
            var awayOdds = 0.0;
            // Calculate the odds
            if (homeTotalBets > 0)
              homeOdds = 1.0 + awayTotalBets / homeTotalBets;
            if (awayTotalBets > 0)
              awayOdds = 1.0 + homeTotalBets / awayTotalBets;

            data.homeName = homeName;
            data.awayName = awayName;
            data.startTime = startTimeISO.replace('T', ' ');
            data.endTime = endTimeISO.replace('T', ' ');
            // Only display 3 decimal digits
            data.oddsHome = homeOdds.toFixed(3).toString();
            data.oddsAway = awayOdds.toFixed(3).toString();

          }).catch(function (err) {
            alert(err.message);
          })
        ,
        BPInstance.getMatchState(sportName, matchID, { from: account })
          .then(function (result) {
            var started = result[0];
            var ended = result[1];
            var homeWins = result[2];
            var betDistributed = result[3];
            var refundPaid = result[4];
            var valid = result[5];

            // Calculate the style controlling variables
            if (started) {
              data.status = 'Match Started';
              data.betBtnStyle = 'btn-outline-secondary';
              data.betBtnDisable = 'disabled';
              data.bgColor = 'bg-danger';
            }
            if (ended) {
              if (homeWins)
                data.status = "Home Wins";
              else
                data.status = "Away Wins";

              data.betBtnStyle = 'btn-outline-secondary';
              data.betBtnDisable = 'disabled';
              data.bgColor = 'bg-dark';
            }
          }).catch(function (err) {
            alert(err.message);
          })
      );
      // Get the template from file
      $.get('templates/matchItemTemplate.html', function (template) {
        card.html($.tmpl(template, data).html());
      });
    });
  });
}

/**
 * When the user select a team to bet, display the input filed to enter the amount of bet
 * and the button of making bets
 * 
 * @param event: the click event
 */
function showBetPage(event) {
  var id = $(event.target).attr('data-id');
  $('.bet-page[data-id=' + id + ']').show();
}

/**
 * Display the statistical information of the selecting match
 * 
 * @param event: the click event
 */
function refreshStatChart(event) {
  var sportName = getSportName();
  var id = $(event.target).attr('data-id');

  BPInstance.getMatchInfo(sportName, id).then(function (result) {
    // Get the total bets of each side
    var homeTotalBets = web3.fromWei(result[4]);
    var awayTotalBets = web3.fromWei(result[5]);
    // Construct the modal from template file
    $.get('templates/statModal.html', function (template) {
      var modal = $.tmpl(template, {});
      var canvas = modal.find('#oddsChart')[0];
      var ctx = canvas.getContext('2d');
      // Shown as pie chart
      var oddsChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Home', 'Away'],
          datasets: [{
            data: [homeTotalBets, awayTotalBets],
            backgroundColor: ['#ff6384', '#36a2eb']
          }]
        },
        options:
          {
            pieceLabel: {
              render: 'value',
              fontSize: 30,
              fontColor: '#ffffff'
            }
          }
      });
      modal.modal('show');
    });
  });
}

/**
 * Make a bet to the selecting match
 * 
 * @param event: the click event 
 */
function makeBetHandler(event) {
  web3.eth.getAccounts(function (error, accounts) {
    if (error) {
      alert(err.message);
    }

    var account = accounts[0];

    App.contracts.BettingPlatform.deployed().then(async function (instance) {
      BPInstance = instance;

      // Get the surcharge rate
      var surchargePercentage = 0;
      await BPInstance.getSurchargePercentage().then(function (result) {
        surchargePercentage = web3.toDecimal(result) / 100;
      })
      // Get the selecting sport name and match ID
      var sportName = getSportName();
      var id = $(event.target).attr('data-id');
      // Get the amount and team of bet
      var amount = parseFloat($('.input-bet[data-id=' + id + ']').val());
      var team = $('.active[data-id=' + id + ']').attr('id') === 'home';
      var now = new Date().getTime();
      // Make a bet
      BPInstance.makeBet(sportName, team, id, now, { from: account, value: web3.toWei(amount * (1 + surchargePercentage), 'ether') })
        .then(function (result) {
          // Display the receipt when the transaction is made
          var receipt = result.receipt;
          $.get('templates/receiptModal.html', function (template) {
            $.tmpl(template, {
              receiptStatus: receipt.status,
              blockHash: receipt.blockHash,
              blockNumber: receipt.blockNumber,
              cumGasUsed: receipt.cumulativeGasUsed,
              gasUsed: receipt.gasUsed,
              transHash: receipt.transactionHash,
              transIndex: receipt.transactionIndex
            }).modal('show');
          });
        }).catch(function (err) {
          alert(err.message);
        });
    });
  });
}

/**
 * Display the profile page
 * 
 * @param event: the click event
 */
function showProfilePage(event) {
  $('.sportBlock').removeClass('active');
  $('#bet-placed-option').hide();
  $('#gamesRow').empty();

  web3.eth.getAccounts(function (error, accounts) {
    if (error) {
      alert(err.message);
    }

    var account = accounts[0];

    App.contracts.BettingPlatform.deployed().then(function (instance) {
      BPInstance = instance;
      // Get the total number of bets the current user have placed
      BPInstance.getNumBets({ from: account })
        .then(function (result) {
          var nBets = web3.toDecimal(result);
          var betTable = $('#betTable');
          var betRow = $('#betsRow');
          betTable.show();
          betRow.empty();
          // Get all bets placed by current user
          for (var i = 0; i < nBets; i++)
            refreshBet(i);
        });
    });
  });
}

/**
 * Get the ith bet of the current user
 * 
 * @param {int} betIndex: the ith bet index
 */
function refreshBet(betIndex) {
  web3.eth.getAccounts(function (error, accounts) {
    if (error) {
      alert(err.message);
    }

    var account = accounts[0];

    App.contracts.BettingPlatform.deployed().then(function (instance) {
      BPInstance = instance;

      var row = $('.row-bet[data-id=' + betIndex + ']');
      var matchStatus = 'Available';
      // Get the ith bet
      BPInstance.getBetInfo(betIndex, { from: account }).then(async function (result) {
        var sportName = result[0];
        var matchID = web3.toDecimal(result[1]);
        var amount = web3.fromWei(result[2]).toFixed(4);
        var surcharge = web3.fromWei(result[3]).toFixed(4);
        var forHome = result[4];
        var teamStr;
        var timeOfBet = new Date(parseInt(result[5]));
        var timeOfBetISO = new Date(timeOfBet.getTime() - (timeOfBet.getTimezoneOffset() * 60000)).toISOString().substr(0, 16).replace('T', ' ');
        var refund = web3.fromWei(result[6]).toFixed(4);
        var outcome = web3.fromWei(result[7]).toFixed(4);
        var total = 'N/A';
        var display = '';

        row.find('.sport-name').text(sportName);
        row.find('.match-id').text(matchID);
        row.find('.bet-time').text(timeOfBetISO);
        row.find('.bet-amount').text(amount);
        row.find('.bet-surcharge').text(surcharge);
        if (forHome)
          teamStr = "Home";
        else
          teamStr = "Away";
        // Get the corresponding match information
        BPInstance.getMatchState(sportName, matchID, { from: account })
          .then(function (result) {
            var started = result[0];
            var ended = result[1];
            var homeWins = result[2];
            var valid = result[5];

            if (started) {
              matchStatus = 'Match Started';
              display = 'd-none';
            }
            else
              refund = 'N/A';

            if (ended) {
              matchStatus = 'Match Ended';
              display = 'd-none';
              if (homeWins)
                matchStatus = "Home Wins";
              else
                matchStatus = "Away Wins";
            }

            if (!valid) {
              display = 'd-none';
              matchStatus = "Deleted";
            }
            // if(outcome == 0)
            //   outcome = 'N/A';

            if (refund != 'N/A' && outcome != 'N/A')
              total = (parseFloat(refund) + parseFloat(outcome)).toFixed(4);

            $.get('templates/betItemTemplate.html', function (template) {
              $.tmpl(template, {
                matchStatus: matchStatus,
                sportName: sportName,
                matchID: matchID,
                betTime: timeOfBetISO,
                amountSurcharge: amount + ' (' + surcharge + ')',
                betTeam: teamStr,
                outcomeRefund: outcome + ' (' + refund + ')',
                total: total,
                betID: betIndex,
                display: display
              }).appendTo('#betsRow');
            });
          }).catch(function (err) {
            alert(err.message);
          });
      }).catch(function (err) {
        alert(err.message);
      });
    });
  });
}

/**
 * Allow user to switch their bet from one team to the other team
 * 
 * @param event: the click event
 */
function switchBetHandler(event) {
  web3.eth.getAccounts(function (error, accounts) {
    if (error) {
      alert(err.message);
    }

    var account = accounts[0];

    App.contracts.BettingPlatform.deployed().then(function (instance) {
      BPInstance = instance;
      // Get the bet index
      var betID = $(event.target).attr('data-id');
      var now = new Date().getTime();
      // Send request to switch
      BPInstance.modifyBetAtIndex(betID, now, { from: account })
        .then(function (result) {
          // Display the receipt when the transaction is made
          var receipt = result.receipt;
          $.get('templates/receiptModal.html', function (template) {
            $.tmpl(template, {
              receiptStatus: receipt.status,
              blockHash: receipt.blockHash,
              blockNumber: receipt.blockNumber,
              cumGasUsed: receipt.cumulativeGasUsed,
              gasUsed: receipt.gasUsed,
              transHash: receipt.transactionHash,
              transIndex: receipt.transactionIndex
            }).modal('show');
          });
        }).catch(function (err) {
          alert(err.message);
        });
    });
  });
}

/**
 * Filter the matches by their status
 * 
 * @param event: the change event
 */
function statusFiltering(event) {
  var status = $('.game-filter').val();

  $('.panel-game').each(function () {
    var currentStatus = $(this).find('.match-status').text();
    $(this).addClass('d-none');
    if (status == 'All' || currentStatus == status)
      $(this).removeClass('d-none');
  });

  $('.bet-row').each(function () {
    var currentStatus = $(this).find('.match-status').text();
    $(this).addClass('d-none');
    if (status == 'All' || currentStatus == status)
      $(this).removeClass('d-none');
  });
}

/**
 * Filter the matches by match ID
 * 
 * @param event: the keyup event 
 */
function IDFiltering(event) {
  var idStr = $('.search-id').val();

  $('.panel-game').each(function () {
    var currentID = $(this).attr('data-id');
    $(this).addClass('d-none');
    if (idStr == '' || currentID == idStr)
      $(this).removeClass('d-none');
  });

  $('.bet-row').each(function () {
    var currentID = $(this).attr('data-id');
    $(this).addClass('d-none');
    if (idStr == '' || currentID == idStr)
      $(this).removeClass('d-none');
  });
}