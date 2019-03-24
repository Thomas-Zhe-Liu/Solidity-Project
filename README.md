# COMP3900 Blockchain Betting Platform

## Installation

1. Add Metamask extension to Chrome [Here](https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn)
2. Download and install Ganache from [Here](http://truffleframework.com/ganache/)
3. Download and install npm from [Here](https://nodejs.org/en/)
4. Install truffle via terminal ```npm install -g truffle```

## Configuration

1. Ganache
    * Once Ganache is launched, the GUI will show all information about the running blockchain
    * We are going to use two of them to configure Metamask:
        * **RPC SERVER**, the default value should be ```HTTP://127.0.0.1:7545```
        * **MNEMONIC**
    * Increase the Gas Limit to 20000000 in Setting=>Chain
2. Metamask
    * Accept terms and conditions
    * It will ask you to create a new DEN of Import Existing DEN. Choose Import Existing DEN
    * Enter the **MNEMONIC** from Ganache to the wallet seed field, and set your preferred password
    * We are currently in the Main Network. Click the dropdown list in the top left corner of Metamask next to the fox head, and then select Custom PRC. Enter the **PRC SERVER** from Ganache. Then we are on our private blockchain now

## Running

1. Launch Ganache to run the testing blockchain
2. Compile and migrate the smart contract to blockchain via terminal
    * ```cd Project```
    * ```make```

3. Launch lite-server via terminal ```npm run dev```
4. Launch Chrome and login your Metamask
5. Visit the betting platform
    * The home page is [http://localhost:3000/](http://localhost:3000/)
    * The admin page is [http://localhost:3000/admin.html](http://localhost:3000/admin.html)
    * The port number could be different, see the output from lite-server

## Known issues

1. When deleting the last match, an error (VM Exception while processing transaction) may occur. This is probably due to a bug of the VM in Ganache because this issue only happens in Ganache and not in Remix. After investigation the backtrace, the VM executes the wrong line of code at the end which should never be there logically
2. When switching a bet, the same issue as in #1 may occur, which is very similar to issue #1
* Issue #1 and #2 most likely happen when there is only one match or bet, and they behave as expected in other situations
