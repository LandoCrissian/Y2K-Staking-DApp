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
    // Y2K Token ABI (Minimal)
    y2k: [
        { "inputs": [{"internalType": "address", "name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function" },
        { "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "approve", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function" }
    ],

    // Full Staking Contract ABI
    staking: [
        { "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}, {"internalType": "address", "name": "referrer", "type": "address"}], "name": "stake", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "unstake", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [], "name": "claimReward", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [{"internalType": "bool", "name": "status", "type": "bool"}], "name": "toggleAutoCompounding", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [{"internalType": "address", "name": "account", "type": "address"}], "name": "stakes", "outputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}], "stateMutability": "view", "type": "function" },
        { "inputs": [{"internalType": "address", "name": "account", "type": "address"}], "name": "earned", "outputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}], "stateMutability": "view", "type": "function" }
    ]
};

// Utility functions
const txUtils = {
    async sendTransaction(web3, tx, account) {
        let gasLimit;
        try {
            gasLimit = await tx.estimateGas({ from: account });
        } catch (error) {
            console.warn("Gas estimation failed, using fallback:", error);
            gasLimit = 300000;
        }

        return await tx.send({
            from: account,
            gas: web3.utils.toHex(Math.floor(gasLimit * 1.2))
        });
    }
};

// Initialize Web3 & Contracts
async function initializeContracts(web3Instance) {
    return {
        staking: new web3Instance.eth.Contract(CONTRACT_ABIS.staking, CONTRACT_ADDRESSES.staking),
        y2k: new web3Instance.eth.Contract(CONTRACT_ABIS.y2k, CONTRACT_ADDRESSES.y2k)
    };
}

window.contractConfig = {
    addresses: CONTRACT_ADDRESSES,
    abis: CONTRACT_ABIS,
    utils: txUtils,
    initializeContracts
};
