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

    // Your full staking ABI
    staking: [/* Your full staking ABI */],

    // Your full POGS ABI
    pogs: [/* Your full POGS ABI */]
};

// Transaction Utilities
const txUtils = {
    async getGasPrice(web3) {
        try {
            const gasPrice = await web3.eth.getGasPrice();
            // Add 20% buffer for Cronos network
            return Math.floor(Number(gasPrice) * 1.2).toString();
        } catch (error) {
            console.error("Gas price estimation failed:", error);
            return '5000000000'; // 5 Gwei fallback
        }
    },

    async estimateGas(method, from, value = '0x0') {
        try {
            const gasEstimate = await method.estimateGas({ from, value });
            return web3.utils.toHex(Math.floor(gasEstimate * 1.2)); // 20% buffer
        } catch (error) {
            console.error("Gas estimation failed:", error);
            return web3.utils.toHex(300000); // Default gas limit
        }
    },

    formatAmount(amount, decimals = 18) {
        return parseFloat(web3.utils.fromWei(amount)).toFixed(decimals);
    },

    getErrorMessage(error) {
        if (error.code === 4001) return "Transaction rejected by user";
        if (error.message.includes("gas")) return "Please ensure you have enough CRO for gas fees";
        if (error.message.includes("insufficient funds")) return "Insufficient balance";
        return "Transaction failed. Please try again";
    }
};

// Network Utilities
const networkUtils = {
    async verifyNetwork(provider) {
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

    async switchToCronos(provider) {
        if (!provider) return;

        try {
            await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: CRONOS_NETWORK.chainId }],
            });
        } catch (switchError) {
            console.log("Switch error:", switchError.code);
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

// Export all utilities and configurations
window.contractConfig = {
    addresses: CONTRACT_ADDRESSES,
    abis: CONTRACT_ABIS,
    network: CRONOS_NETWORK,
    utils: txUtils,
    networkUtils: networkUtils,
    initializeContracts: initializeContracts
};

console.log("Contract configuration loaded successfully");
