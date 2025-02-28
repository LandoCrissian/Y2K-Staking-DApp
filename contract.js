// Import WalletConnect Provider
const WalletConnectProvider = window.WalletConnectProvider.default;

// Define Web3 & Wallet Connection
let web3;
let provider;
let userWalletAddress = null;

// Multi-Wallet Support (MetaMask + WalletConnect)
async function connectWallet(walletType) {
    try {
        if (walletType === 'metamask' && typeof window.ethereum !== 'undefined') {
            provider = window.ethereum;
            web3 = new Web3(provider);
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            userWalletAddress = accounts[0];
        } else if (walletType === 'walletconnect') {
            provider = new WalletConnectProvider({
                rpc: { 25: 'https://evm.cronos.org' }, // Cronos RPC
                chainId: 25
            });
            await provider.enable();
            web3 = new Web3(provider);
            const accounts = await web3.eth.getAccounts();
            userWalletAddress = accounts[0];
        } else {
            alert("⚠️ Please install MetaMask or use WalletConnect.");
            return;
        }

        console.log("✅ Wallet Connected:", userWalletAddress);
        document.getElementById('walletAddressDisplay').innerText = `Connected: ${userWalletAddress}`;
        initializeContracts();
    } catch (error) {
        console.error("❌ Wallet Connection Error:", error);
    }
}

// Contract Configuration
const contractConfig = {
    stakingContractAddress: "0x7DC6a9900e9DE69fF36ECb7dF56aA7c9157DE483",
    stakingABI: [
        {
            "inputs": [
                { "internalType": "address", "name": "_y2kToken", "type": "address" },
                { "internalType": "address", "name": "_pogsToken", "type": "address" },
                { "internalType": "uint256", "name": "_rewardRate", "type": "uint256" },
                { "internalType": "address", "name": "_treasury", "type": "address" }
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        { "inputs": [], "name": "claimReward", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "stake", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }], "name": "unstake", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
    ],

    pogsContractAddress: "0xB71402f785fd3D07ad4e34A37429dB2077Fa032D",
    pogsABI: [
        { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
        { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
        { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }
    ],

    y2kContractAddress: "0xB4Df7d2A736Cc391146bB0dF4277E8F68247Ac6d",
    
    network: {
        chainId: '0x19', // Cronos Mainnet
        chainName: 'Cronos',
        nativeCurrency: { name: 'Cronos', symbol: 'CRO', decimals: 18 },
        rpcUrls: ['https://evm.cronos.org'],
        blockExplorerUrls: ['https://cronoscan.com/']
    }
};

// Initialize Contracts (Without Y2K ABI)
let stakingContract, pogsContract;

async function initializeContracts() {
    if (!userWalletAddress) {
        console.error("⚠️ Wallet not connected. Contracts will not initialize.");
        return;
    }

    try {
        stakingContract = new web3.eth.Contract(contractConfig.stakingABI, contractConfig.stakingContractAddress);
        pogsContract = new web3.eth.Contract(contractConfig.pogsABI, contractConfig.pogsContractAddress);

        console.log("✅ Contracts successfully initialized.");
    } catch (error) {
        console.error("❌ Error initializing contracts:", error);
    }
}

// Event Listeners for Wallet Buttons
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('connectMetaMask').addEventListener('click', () => connectWallet('metamask'));
    document.getElementById('connectWalletConnect').addEventListener('click', () => connectWallet('walletconnect'));
});

// Expose Config Globally
window.contractConfig = contractConfig;
