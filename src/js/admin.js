App = {
  web3Provider: null,
  contracts: {},

  init: function () {
    // Get all available sport names from JSON file into a dropdown list
    $.getJSON('../sports.json', function (data) {
      var dropdown = $('.sport-name');
      var optionTemplate = '<option><h1 class="text-center">${SportName}</h1></option>'

      dropdown.empty();
      for (i = 0; i < data.length; i++)
        $.tmpl(optionTemplate, [{ SportName: data[i].name }]).appendTo(dropdown)
    });

    return App.initWeb3();
  },

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

  initContract: function () {
    $.getJSON('BettingPlatform.json', function (data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var BettingPlatformArtifact = data;
      App.contracts.BettingPlatform = TruffleContract(BettingPlatformArtifact);

      // Set the provider for our contract
      App.contracts.BettingPlatform.setProvider(App.web3Provider);

      return;
    }).then(function () {
      refreshSmartContractBalance();
    });

    return App.bindEvents();
  },

  // Binding events
  bindEvents: function () {
    $(document).on('click', '.btn-create', createMatch);
    $(document).on('click', '.btn-search', searchMatch);
    $(document).on('click', '.btn-delete', deleteMatch);
    $(document).on('click', '.btn-modify', modifyMatch);
  },
};


$(function () {
  $(window).load(function () {
    App.init();
    refreshCreateMatch();
  });
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
};

/**
 * Get the balance of the smart contract, i.e. the total bet pool of all available matches
 * 
 */
function refreshSmartContractBalance() {
  web3.eth.getAccounts(function (error, accounts) {
    if (error) {
      alert(err.message);
    }

    var account = accounts[0];

    App.contracts.BettingPlatform.deployed().then(function (instance) {
      BPInstance = instance;

      return BPInstance.getSmartContractBalance({ from: account });
    }).then(function (result) {
      $('#sc-balance').text(web3.fromWei(result));
    });
  });
}

/**
 * Re-initialise all field in create match to the default values
 * 
 */
function refreshCreateMatch() {
  // $("#create-sport-name").val("");
  $("#create-home-name").val("Home");
  $("#create-away-name").val("Away");
  var now = new Date();
  var nowString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().substr(0, 16);
  $("#create-start-time").val(nowString);
  $("#create-end-time").val(nowString);
}

/**
 * Create a match with the input values
 * 
 * @param event: the click event
 */
function createMatch(event) {
  // Get the inputs
  var sportName = $("#create-sport-name").val();
  var homeName = $("#create-home-name").val();
  var awayName = $("#create-away-name").val();
  var startTime = new Date($("#create-start-time").val()).getTime();
  var endTime = new Date($("#create-end-time").val()).getTime();

  web3.eth.getAccounts(function (error, accounts) {
    if (error) {
      alert(err.message);
    }

    var account = accounts[0];

    App.contracts.BettingPlatform.deployed().then(function (instance) {
      BPInstance = instance;

      BPInstance.createMatch(sportName, homeName, awayName, startTime, endTime, { from: account }).then(function (result) {
        // When the transaction is made, re-initialise the input fields
        refreshCreateMatch();
        // and display the receipt
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
 * Search a match with sport name and match ID
 * 
 * @param event: the click event
 */
function searchMatch(event) {
  web3.eth.getAccounts(function (error, accounts) {
    if (error) {
      alert(err.message);
    }

    var account = accounts[0];
    // Get the inputs
    var sportName = $("#search-sport-name").val();
    var matchID = $("#search-match-id").val();
    $("#search-result").hide();

    App.contracts.BettingPlatform.deployed().then(async function (instance) {
      BPInstance = instance;

      // Get information
      BPInstance.getMatchInfo(sportName, matchID, { from: account })
        .then(function (result) {
          var startTime = new Date(parseInt(result[2]));
          var startTimeISO = new Date(startTime.getTime() - (startTime.getTimezoneOffset() * 60000)).toISOString().substr(0, 16);
          var endTime = new Date(parseInt(result[3]));
          var endTimeISO = new Date(endTime.getTime() - (endTime.getTimezoneOffset() * 60000)).toISOString().substr(0, 16);
          var homeName = result[0];
          var awayName = result[1];

          $("#modify-home-name").val(homeName);
          $("#modify-away-name").val(awayName);
          $("#modify-start-time").val(startTimeISO);
          $("#modify-end-time").val(endTimeISO);

          BPInstance.getMatchState(sportName, matchID, { from: account })
            .then(function (result) {
              var started = result[0];
              var ended = result[1];
              var homeWins = result[2];
              var betDistributed = result[3];
              var refundPaid = result[4];
              var valid = result[5];

              $("#modify-match-started").prop('checked', started);
              $("#modify-match-ended").prop('checked', ended);
              $("#modify-home-wins").prop('checked', homeWins);
              $("#modify-bet-distributed").prop('checked', betDistributed);

              $("#search-result").show();
            }).catch(function (err) {
              // console.log(err.message);
              alert("No results");
            })
        }).catch(function (err) {
          // console.log(err.message);
          alert("No results");
        })
    });
  });
}

/**
 * Delete the selecting match
 * 
 * @param event: the click event
 */
function deleteMatch(event) {
  // Get the inputs
  var sportName = $("#search-sport-name").val();
  var matchID = $("#search-match-id").val();

  // Check if the inputs are valid
  if (sportName.length == 0 || matchID.length == 0)
    alert("Empty Field!")
  else {
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        alert(err.message);
      }

      var account = accounts[0];

      App.contracts.BettingPlatform.deployed().then(function (instance) {
        BPInstance = instance;
        // Send the delete request to the smart contract
        BPInstance.deleteMatch(sportName, matchID, { from: account }).then(function (result) {
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
          $("#search-result").hide();
        }).catch(function (err) {
          alert(err.message);
        });
      });
    });
  }
}

/**
 * Modify the details of the selecting match
 * 
 * @param event: the click event
 */
function modifyMatch(event) {
  // Get the inputs
  var sportName = $("#search-sport-name").val();
  var matchID = $("#search-match-id").val();

  // Check if the inputs are valid
  if (sportName.length == 0 || matchID.length == 0)
    alert("Empty Field!")
  else {
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        alert(err.message);
      }

      var account = accounts[0];

      App.contracts.BettingPlatform.deployed().then(function (instance) {
        BPInstance = instance;

        // Get the values to be updated
        var homeName = $("#modify-home-name").val();
        var awayName = $("#modify-away-name").val();
        var startTime = new Date($("#modify-start-time").val()).getTime();
        var endTime = new Date($("#modify-end-time").val()).getTime();
        var started = $("#modify-match-started").prop('checked');
        var ended = $("#modify-match-ended").prop('checked');
        var homeWins = $("#modify-home-wins").prop('checked');
        // Send the update request to the smart contract
        BPInstance.updateMatch(sportName, matchID, homeName, awayName, startTime, endTime, started, ended, homeWins, { from: account }).then(function (result) {
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
          $("#search-result").hide();
        }).catch(function (err) {
          alert(err.message);
        });
      });
    });
  }
}