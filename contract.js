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
    staking: [ /* Full Staking ABI Here (Insert your provided ABI) */ ],

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
