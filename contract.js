// Network Configuration for Cronos
const CRONOS_NETWORK = {
    chainId: '0x19', // Cronos Mainnet
    chainName: 'Cronos Mainnet',
    nativeCurrency: {
        name: 'Cronos',
        symbol: 'CRO',
        decimals: 18
    },
    rpcUrls: ['https://evm.cronos.org'],
    blockExplorerUrls: ['https://cronoscan.com/']
};

// Contract Addresses
const CONTRACT_ADDRESSES = {
    staking: "0x7DC6a9900e9DE69fF36ECb7dF56aA7c9157DE483",
    pogs: "0xB71402f785fd3D07ad4e34A37429dB2077Fa032D",
    y2k: "0xB4Df7d2A736Cc391146bB0dF4277E8F68247Ac6d"
};

// Contract ABIs
const CONTRACT_ABIS = {
    // Y2K Token (Minimal ABI for interactions)
    y2k: [
        { "inputs": [{"internalType": "address", "name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function" },
        { "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "approve", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "spender", "type": "address"}], "name": "allowance", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function" },
        { "inputs": [{"internalType": "address", "name": "recipient", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "transfer", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function" }
    ],

    // Full Staking Contract ABI
    staking: [{"inputs":[{"internalType":"address","name":"_y2kToken","type":"address"},{"internalType":"address","name":"_pogsToken","type":"address"},{"internalType":"uint256","name":"_rewardRate","type":"uint256"},{"internalType":"address","name":"_treasury","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"SafeERC20FailedOperation","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bool","name":"status","type":"bool"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"AutoCompoundingToggled","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newRate","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"BurnRateUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bool","name":"status","type":"bool"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"LotteryToggled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"winner","type":"address"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"roundId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"LotteryWinner","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"MaxStakeAmountUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"referrer","type":"address"},{"indexed":true,"internalType":"address","name":"referee","type":"address"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"ReferralReward","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bool","name":"status","type":"bool"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"ReferralsToggled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"RewardClaimed","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newRate","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"RewardRateUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"Staked","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"Unstaked","type":"event"},{"inputs":[],"name":"LOCK_PERIOD","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"LOTTERY_REWARD_PERCENTAGE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MAX_BURN_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MIN_STAKE_AMOUNT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"REFERRAL_BONUS_RATE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"autoCompoundingEnabled","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"burnRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"claimReward","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"currentLotteryRound","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_token","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"lotteryEnabled","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"lotteryRounds","outputs":[{"internalType":"uint256","name":"roundId","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"bool","name":"distributed","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"maxStakeAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pogsToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"referralRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"referralsEnabled","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"rewardRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"_referrer","type":"address"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"stakes","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"lastCompoundTime","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bool","name":"_status","type":"bool"}],"name":"toggleAutoCompounding","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"_status","type":"bool"}],"name":"toggleLottery","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"_status","type":"bool"}],"name":"toggleReferrals","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"treasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"unstake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_newRate","type":"uint256"}],"name":"updateBurnRate","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_newRate","type":"uint256"}],"name":"updateRewardRate","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"y2kToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"}]

    // Full POGS Token ABI
    pogs: [ /* Full POGS ABI Here (Insert your provided ABI) */ ]
};

// Transaction Utilities
const txUtils = {
    async getGasPrice(web3) {
        try {
            const gasPrice = await web3.eth.getGasPrice();
            return Math.floor(Number(gasPrice) * 1.2).toString(); // 20% buffer for Cronos
        } catch (error) {
            return '5000000000'; // Default 5 Gwei if error occurs
        }
    },

    async sendTransaction(web3, tx, account, options = {}) {
        const maxRetries = options.maxRetries || 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const gasPrice = await this.getGasPrice(web3);
                const gasLimit = await tx.estimateGas({ from: account });

                const receipt = await tx.send({
                    from: account,
                    gasPrice: web3.utils.toHex(gasPrice),
                    gas: web3.utils.toHex(Math.floor(gasLimit * 1.2)) // 20% buffer
                });

                return receipt;
            } catch (error) {
                attempt++;
                if (attempt === maxRetries) throw error;
                await new Promise(r => setTimeout(r, 2000 * attempt));
            }
        }
    },

    formatAmount(amount, decimals = 18) {
        return parseFloat(web3.utils.fromWei(amount)).toFixed(decimals);
    },

    getErrorMessage(error) {
        if (error.code === 4001) return "Transaction rejected by user";
        if (error.message.includes("gas")) return "Ensure you have enough CRO for gas fees";
        if (error.message.includes("insufficient funds")) return "Insufficient balance";
        return "Transaction failed. Please try again";
    }
};

// Network Utilities
const networkUtils = {
    async verifyNetwork(provider) {
        try {
            const chainId = await provider.request({ method: 'eth_chainId' });
            if (chainId !== CRONOS_NETWORK.chainId) {
                await this.switchToCronos(provider);
            }
            return true;
        } catch (error) {
            console.error("Network verification failed:", error);
            return false;
        }
    },

    async switchToCronos(provider) {
        try {
            await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: CRONOS_NETWORK.chainId }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                try {
                    await provider.request({
                        method: 'wallet_addEthereumChain',
                        params: [CRONOS_NETWORK],
                    });
                } catch (addError) {
                    throw new Error('Failed to add Cronos network');
                }
            } else {
                throw switchError;
            }
        }
    }
};

// Contract Initialization
async function initializeContracts(web3Instance) {
    try {
        const contracts = {
            staking: new web3Instance.eth.Contract(CONTRACT_ABIS.staking, CONTRACT_ADDRESSES.staking),
            pogs: new web3Instance.eth.Contract(CONTRACT_ABIS.pogs, CONTRACT_ADDRESSES.pogs),
            y2k: new web3Instance.eth.Contract(CONTRACT_ABIS.y2k, CONTRACT_ADDRESSES.y2k)
        };

        // Verify contracts are deployed
        const codes = await Promise.all([
            web3Instance.eth.getCode(CONTRACT_ADDRESSES.staking),
            web3Instance.eth.getCode(CONTRACT_ADDRESSES.pogs),
            web3Instance.eth.getCode(CONTRACT_ADDRESSES.y2k)
        ]);

        if (codes.some(code => code === '0x' || code === '0x0')) {
            throw new Error("One or more contracts not deployed");
        }

        return contracts;
    } catch (error) {
        console.error("Contract initialization failed:", error);
        throw error;
    }
}

// Export all utilities and configurations
window.contractConfig = {
    addresses: CONTRACT_ADDRESSES,
    abis: CONTRACT_ABIS,
    network: CRONOS_NETWORK
};
window.txUtils = txUtils;
window.networkUtils = networkUtils;
window.initializeContracts = initializeContracts;
