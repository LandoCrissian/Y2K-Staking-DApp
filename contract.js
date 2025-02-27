// Import Web3 (Ensure it's included in your HTML file)
if (typeof window.ethereum !== 'undefined') {
    window.web3 = new Web3(window.ethereum);
}

// Y2K Staking Contract Details
const stakingContractAddress = "0x7DC6a9900e9DE69fF36ECb7dF56aA7c9157DE483";
const stakingABI = [
    // Full Staking Contract ABI inserted here
    {"inputs":[{"internalType":"address","name":"_y2kToken","type":"address"},
               {"internalType":"address","name":"_pogsToken","type":"address"},
               {"internalType":"uint256","name":"_rewardRate","type":"uint256"},
               {"internalType":"address","name":"_treasury","type":"address"}],
     "stateMutability":"nonpayable","type":"constructor"},
    
    {"inputs":[],"name":"claimReward","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],
     "name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],
     "name":"unstake","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"bool","name":"_status","type":"bool"}],
     "name":"toggleAutoCompounding","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"bool","name":"_status","type":"bool"}],
     "name":"toggleLottery","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"bool","name":"_status","type":"bool"}],
     "name":"toggleReferrals","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[],"name":"rewardRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"","type":"address"}],
     "name":"stakes","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},
                                {"internalType":"uint256","name":"startTime","type":"uint256"},
                                {"internalType":"uint256","name":"lastCompoundTime","type":"uint256"}],
     "stateMutability":"view","type":"function"}
];

// POGS Token Contract Details
const pogsContractAddress = "0xB71402f785fd3D07ad4e34A37429dB2077Fa032D";
const pogsABI = [
    // Full POGS Contract ABI inserted here
    {"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"account","type":"address"}],
     "name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"recipient","type":"address"},
               {"internalType":"uint256","name":"amount","type":"uint256"}],
     "name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"sender","type":"address"},
               {"internalType":"address","name":"recipient","type":"address"},
               {"internalType":"uint256","name":"amount","type":"uint256"}],
     "name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"spender","type":"address"},
               {"internalType":"uint256","name":"value","type":"uint256"}],
     "name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"owner","type":"address"},
               {"internalType":"address","name":"spender","type":"address"}],
     "name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
];

// Export to use in script.js
export { stakingContractAddress, stakingABI, pogsContractAddress, pogsABI };
