// Check for Web3 availability
if (typeof window.ethereum === 'undefined' && typeof Web3 === 'undefined') {
    console.warn("No Web3 detected. Please install MetaMask or use a Web3-enabled browser.");
}

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
    // Staking Contract ABI (keeping only necessary functions for the dashboard)
    staking: [
        {"inputs":[{"internalType":"address","name":"_y2kToken","type":"address"},{"internalType":"address","name":"_pogsToken","type":"address"},{"internalType":"uint256","name":"_rewardRate","type":"uint256"},{"internalType":"address","name":"_treasury","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
        {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"stakes","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"lastCompoundTime","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"rewardRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"autoCompoundingEnabled","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"referralsEnabled","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"referralRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"_referrer","type":"address"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"unstake","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[],"name":"claimReward","outputs":[],"stateMutability":"nonpayable","type":"function"}
    ],
    // POGS Token ABI (keeping minimal required functions)
    pogs: [
        {"inputs":[],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"}
    ]
};

// Transaction Utilities
const txUtils = {
    getGasPrice: async function(web3) {
        try {
            const gasPrice = await web3.eth.getGasPrice();
            return Math.floor(Number(gasPrice) * 1.2).toString();
        } catch (error) {
            console.error("Gas price estimation failed:", error);
            return '5000000000'; // Default fallback
        }
    },

    estimateGas: async function(method, from, value = '0x0') {
        try {
            const gasEstimate = await method.estimateGas({ from, value });
            return web3.utils.toHex(Math.floor(gasEstimate * 1.2));
        } catch (error) {
            console.error("Gas estimation failed:", error);
            return web3.utils.toHex(300000); // Default fallback
        }
    },

    formatAmount: function(web3, amount, decimals = 3) {
        try {
            const number = parseFloat(web3.utils.fromWei(amount));
            return number.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: decimals,
                useGrouping: true
            });
        } catch (error) {
            console.error("Format error:", error);
            return '0.00';
        }
    },

    getErrorMessage: function(error) {
        if (error.code === 4001) return "Transaction rejected by user";
        if (error.message.includes("gas")) return "Please ensure you have enough CRO for gas fees";
        if (error.message.includes("insufficient funds")) return "Insufficient balance";
        return "Transaction failed. Please try again";
    }
};

// Network Utilities
const networkUtils = {
    verifyNetwork: async function(provider) {
        if (!provider) {
            console.error("No provider available");
            return false;
        }

        try {
            const chainId = await provider.request({ method: 'eth_chainId' });
            if (chainId !== CRONOS_NETWORK.chainId) {
                console.log("Wrong network detected. Current:", chainId, "Expected:", CRONOS_NETWORK.chainId);
                await this.switchToCronos(provider);
            }
            return true;
        } catch (error) {
            console.error("Network verification failed:", error);
            return false;
        }
    },

    switchToCronos: async function(provider) {
        if (!provider) return;

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
                    console.error("Failed to add Cronos network:", addError);
                }
            }
        }
    }
};

// Contract Initialization
async function initializeContracts(web3Instance) {
    if (!web3Instance) {
        console.error("Web3 instance not provided");
        return null;
    }

    try {
        const contracts = {
            staking: new web3Instance.eth.Contract(CONTRACT_ABIS.staking, CONTRACT_ADDRESSES.staking),
            pogs: new web3Instance.eth.Contract(CONTRACT_ABIS.pogs, CONTRACT_ADDRESSES.pogs),
            y2k: new web3Instance.eth.Contract(CONTRACT_ABIS.y2k, CONTRACT_ADDRESSES.y2k)
        };

        return contracts;
    } catch (error) {
        console.error("Contract initialization failed:", error);
        return null;
    }
}

// Staking Utilities
const stakingUtils = {
    calculateRewards: async function(stakingContract, userAddress, web3) {
        try {
            const stakeInfo = await stakingContract.methods.stakes(userAddress).call();
            const rewardRate = await stakingContract.methods.rewardRate().call();
            
            if (stakeInfo.amount === '0') return '0';

            const timeElapsed = Math.floor(Date.now() / 1000) - parseInt(stakeInfo.startTime);
            const stakedAmount = web3.utils.fromWei(stakeInfo.amount, "ether");
            const dailyReward = (parseFloat(stakedAmount) * (rewardRate / 10000)) / 365;
            const estimatedRewards = (dailyReward * timeElapsed) / 86400;
            
            return estimatedRewards.toFixed(4);
        } catch (error) {
            console.error("Error calculating rewards:", error);
            return '0';
        }
    }
};

// Export all utilities and configurations
window.contractConfig = {
    addresses: CONTRACT_ADDRESSES,
    abis: CONTRACT_ABIS,
    network: CRONOS_NETWORK,
    utils: txUtils,
    networkUtils: networkUtils,
    stakingUtils: stakingUtils,
    initializeContracts: initializeContracts
};

console.log("Contract configuration loaded successfully");
