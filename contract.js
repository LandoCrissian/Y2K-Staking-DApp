// Contract verification functions
const requiredStakingFunctions = ['stake', 'unstake', 'claimReward', 'earned', 'stakes', 'totalStaked'];
const requiredTokenFunctions = ['balanceOf', 'approve', 'allowance', 'transfer'];

const contractConfig = {
    stakingContractAddress: "0x7DC6a9900e9DE69fF36ECb7dF56aA7c9157DE483",
    stakingABI: [
        // Your existing staking ABI...
    ],

    pogsContractAddress: "0xB71402f785fd3D07ad4e34A37429dB2077Fa032D",
    pogsABI: [
        // Your existing POGS ABI...
    ],

    y2kContractAddress: "0xB4Df7d2A736Cc391146bB0dF4277E8F68247Ac6d",
    y2kABI: [
        // Your existing Y2K ABI...
    ],

    // Add network configuration
    network: {
        chainId: '0x38', // BSC Mainnet
        chainName: 'Binance Smart Chain',
        nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18
        },
        rpcUrls: ['https://bsc-dataseed.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com/']
    }
};

// Verify contract functions
const verifyContracts = () => {
    console.log("Verifying contract configurations...");
    
    // Verify staking contract
    const stakingFunctions = contractConfig.stakingABI
        .filter(item => item.type === 'function')
        .map(item => item.name);
    
    const missingStaking = requiredStakingFunctions
        .filter(fn => !stakingFunctions.includes(fn));
    
    if (missingStaking.length > 0) {
        console.error("Missing staking functions:", missingStaking);
    }

    // Verify token contracts
    const tokenFunctions = contractConfig.y2kABI
        .filter(item => item.type === 'function')
        .map(item => item.name);
    
    const missingToken = requiredTokenFunctions
        .filter(fn => !tokenFunctions.includes(fn));
    
    if (missingToken.length > 0) {
        console.error("Missing token functions:", missingToken);
    }

    // Verify addresses
    if (!web3.utils.isAddress(contractConfig.stakingContractAddress)) {
        console.error("Invalid staking contract address");
    }
    if (!web3.utils.isAddress(contractConfig.y2kContractAddress)) {
        console.error("Invalid Y2K contract address");
    }
    if (!web3.utils.isAddress(contractConfig.pogsContractAddress)) {
        console.error("Invalid POGS contract address");
    }
};

// Add helper functions
contractConfig.utils = {
    async getNetworkGasPrice() {
        try {
            const gasPrice = await web3.eth.getGasPrice();
            return web3.utils.toHex(Math.floor(gasPrice * 1.1)); // Add 10% buffer
        } catch (error) {
            console.error("Error getting gas price:", error);
            return web3.utils.toHex(5000000000); // Default to 5 GWEI
        }
    },

    async estimateGas(method, from, value = '0x0') {
        try {
            const gasEstimate = await method.estimateGas({ from, value });
            return web3.utils.toHex(Math.floor(gasEstimate * 1.2)); // Add 20% buffer
        } catch (error) {
            console.error("Gas estimation failed:", error);
            return web3.utils.toHex(200000); // Default gas limit
        }
    }
};

// Make config available globally
window.contractConfig = contractConfig;

// Run verification when Web3 is available
if (typeof web3 !== 'undefined') {
    verifyContracts();
}
