const contractConfig = {
    stakingContractAddress: "0x7DC6a9900e9DE69fF36ECb7dF56aA7c9157DE483",
    stakingABI: [
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
        {"inputs":[],"name":"rewardRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"address","name":"","type":"address"}],
         "name":"stakes","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},
                                    {"internalType":"uint256","name":"startTime","type":"uint256"},
                                    {"internalType":"uint256","name":"lastCompoundTime","type":"uint256"}],
         "stateMutability":"view","type":"function"},
        {"inputs":[],"name":"totalStaked","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"address","name":"_user","type":"address"}],
         "name":"earned","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
    ],

    pogsContractAddress: "0xB71402f785fd3D07ad4e34A37429dB2077Fa032D",
    pogsABI: [
        {"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"address","name":"account","type":"address"}],
         "name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"address","name":"recipient","type":"address"},
                   {"internalType":"uint256","name":"amount","type":"uint256"}],
         "name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"internalType":"address","name":"spender","type":"address"},
                   {"internalType":"uint256","name":"value","type":"uint256"}],
         "name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"internalType":"address","name":"owner","type":"address"},
                   {"internalType":"address","name":"spender","type":"address"}],
         "name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
    ],

    y2kContractAddress: "0xB4Df7d2A736Cc391146bB0dF4277E8F68247Ac6d",
    y2kABI: [
        {"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"address","name":"account","type":"address"}],
         "name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"address","name":"recipient","type":"address"},
                   {"internalType":"uint256","name":"amount","type":"uint256"}],
         "name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"internalType":"address","name":"spender","type":"address"},
                   {"internalType":"uint256","name":"value","type":"uint256"}],
         "name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"internalType":"address","name":"owner","type":"address"},
                   {"internalType":"address","name":"spender","type":"address"}],
         "name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
    ]
};

window.contractConfig = contractConfig;
