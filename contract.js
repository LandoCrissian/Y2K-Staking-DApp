// Ensure Web3 is available
if (typeof web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
} else {
    console.error("⚠️ Web3 provider not detected. Please connect to a Web3 wallet.");
}

// Define required function sets for verification
const requiredStakingFunctions = ['stake', 'unstake', 'claimReward', 'earned', 'stakes', 'totalStaked'];
const requiredTokenFunctions = ['balanceOf', 'approve', 'allowance', 'transfer'];

const contractConfig = {
    stakingContractAddress: "0x7DC6a9900e9DE69fF36ECb7dF56aA7c9157DE483",
    stakingABI: [
        // 🔹 Full Staking Contract ABI
        {"inputs":[{"internalType":"address","name":"_y2kToken","type":"address"},{"internalType":"address","name":"_pogsToken","type":"address"},{"internalType":"uint256","name":"_rewardRate","type":"uint256"},{"internalType":"address","name":"_treasury","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
        {"inputs":[],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[],"name":"unstake","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[],"name":"claimReward","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[],"name":"earned","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"totalStaked","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
    ],

    pogsContractAddress: "0xB71402f785fd3D07ad4e34A37429dB2077Fa032D",
    pogsABI: [
        // 🔹 Full POGS Contract ABI
        {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
        {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}
    ],

    y2kContractAddress: "0xB4Df7d2A736Cc391146bB0dF4277E8F68247Ac6d",
    y2kABI: [
        // 🔹 Full Y2K Contract ABI
        {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
        {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}
    ],

    network: {
        chainId: '0x19', // Cronos Mainnet Chain ID
        chainName: 'Cronos Mainnet',
        nativeCurrency: {
            name: 'Cronos',
            symbol: 'CRO',
            decimals: 18
        },
        rpcUrls: ['https://evm.cronos.org'],
        blockExplorerUrls: ['https://cronoscan.com/']
    }
};

// ✅ Initialize Contract Instances
let stakingContract, pogsContract, y2kContract;

async function initializeContracts() {
    if (!web3) {
        console.error("⚠️ Web3 is not initialized!");
        return;
    }

    try {
        stakingContract = new web3.eth.Contract(contractConfig.stakingABI, contractConfig.stakingContractAddress);
        pogsContract = new web3.eth.Contract(contractConfig.pogsABI, contractConfig.pogsContractAddress);
        y2kContract = new web3.eth.Contract(contractConfig.y2kABI, contractConfig.y2kContractAddress);

        console.log("✅ Contracts successfully initialized");
    } catch (error) {
        console.error("❌ Error initializing contracts:", error);
    }
}

// ✅ Verify Contracts
const verifyContracts = () => {
    console.log("🔍 Verifying contract configurations...");

    if (!stakingContract || !pogsContract || !y2kContract) {
        console.error("❌ Contracts are not initialized correctly.");
        return;
    }

    console.log("✅ Contract verification complete.");
};

// ✅ Utility Functions
contractConfig.utils = {
    async getNetworkGasPrice() {
        try {
            const gasPrice = await web3.eth.getGasPrice();
            return web3.utils.toHex(Math.floor(gasPrice * 1.1)); // Add 10% buffer
        } catch (error) {
            console.error("⚠️ Error getting gas price:", error);
            return web3.utils.toHex(5000000000); // Default to 5 GWEI
        }
    },

    async estimateGas(method, from, value = '0x0') {
        try {
            const gasEstimate = await method.estimateGas({ from, value });
            return web3.utils.toHex(Math.floor(gasEstimate * 1.2)); // Add 20% buffer
        } catch (error) {
            console.error("⚠️ Gas estimation failed:", error);
            return web3.utils.toHex(200000); // Default gas limit
        }
    }
};

// ✅ Make Config Available Globally
window.contractConfig = contractConfig;

// ✅ Initialize Contracts & Verify
initializeContracts().then(() => verifyContracts());
