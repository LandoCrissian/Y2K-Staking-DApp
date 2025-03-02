// Web3 and Contract Initialization Check
if (typeof window.ethereum === 'undefined' && typeof window.web3 === 'undefined') {
    console.warn("⚠️ No Web3 provider detected.");
}

// Global Variables
let web3;
let stakingContract;
let pogsContract;
let y2kContract;
let userAccount = null;
let hasSigned = false;
let isInitialized = false;

// Enhanced Staking Calculator with Improved Formatting
const stakingCalculator = {
    formatBalance: function(amount) {
        const num = parseFloat(amount);
        if (isNaN(num)) return '0.00';

        if (num === 0) return '0.00';
        if (num < 0.01) return '<0.01';
        if (num < 1000) return num.toFixed(2);
        if (num < 1000000) return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
        if (num < 1000000000) return `${(num / 1000000).toFixed(2)}M`;
        return `${(num / 1000000000).toFixed(2)}B`;
    },

    formatAPY: function(rewardRate) {
        const apy = (rewardRate / 100);
        return this.formatBalance(apy);
    },

    calculateRewards: function(stakeInfo, rewardRate) {
        if (!stakeInfo.amount || stakeInfo.amount === '0') return '0.00';

        try {
            const stakedAmount = web3.utils.fromWei(stakeInfo.amount, 'ether');
            const lastCompoundTime = parseInt(stakeInfo.lastCompoundTime);
            const currentTime = Math.floor(Date.now() / 1000);
            const duration = currentTime - lastCompoundTime;

            // Calculate rewards using contract formula
            const rawReward = (parseFloat(stakedAmount) * duration * (rewardRate / 1e18));
            const burnRate = 10; // Contract default
            const netReward = rawReward * (1 - (burnRate / 100));

            return this.formatBalance(netReward);
        } catch (error) {
            console.error("Reward calculation error:", error);
            return '0.00';
        }
    },

    getDurationString: function(timestamp) {
        if (!timestamp) return 'Not staking';
        const now = Math.floor(Date.now() / 1000);
        const duration = now - parseInt(timestamp);
        
        const days = Math.floor(duration / 86400);
        const hours = Math.floor((duration % 86400) / 3600);
        const minutes = Math.floor((duration % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }
};

// Enhanced Contract Initialization
async function initializeWeb3() {
    console.log("🔹 Starting Web3 initialization...");

    try {
        if (!window.ethereum) {
            throw new Error("No Web3 provider found. Please install MetaMask!");
        }

        web3 = new Web3(window.ethereum);
        
        // Wait for contract config with timeout
        const config = await waitForContractConfig();
        if (!config) {
            throw new Error("Contract configuration failed to load");
        }

        const contracts = await config.initializeContracts(web3);
        if (!contracts) {
            throw new Error("Failed to initialize contracts");
        }

        stakingContract = contracts.staking;
        pogsContract = contracts.pogs;
        y2kContract = contracts.y2k;

        if (!verifyContracts()) {
            throw new Error("Contract verification failed");
        }

        isInitialized = true;
        console.log("✅ Web3 initialization complete");
        
        setupWalletListeners();
        await checkExistingConnection();

    } catch (error) {
        console.error("❌ Initialization Error:", error);
        showError(error.message);
    }
}

// Wallet Connection with Enhanced Security
async function connectWallet() {
    if (!isInitialized) {
        showError("Please wait for initialization to complete");
        return;
    }

    console.log("🔹 Attempting wallet connection...");

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (!accounts.length) {
            throw new Error("No accounts found");
        }

        userAccount = accounts[0];
        console.log("✅ Wallet connected:", userAccount);

        // Network check
        await checkAndSwitchNetwork();

        if (!hasSigned) {
            await requestSignature();
        }

        updateWalletButton();
        await updateDashboard();

    } catch (error) {
        console.error("❌ Connection Error:", error);
        showError(error.message);
        resetWalletState();
    }
}

// Enhanced Dashboard Update
async function updateDashboard() {
    if (!userAccount || !isInitialized) return;

    console.log("🔹 Updating dashboard...");
    showLoading();

    try {
        // Fetch all data in parallel
        const [
            y2kBalance,
            stakeInfo,
            rewardRate,
            autoCompounding,
            referralsEnabled,
            referralRewards
        ] = await Promise.all([
            y2kContract.methods.balanceOf(userAccount).call(),
            stakingContract.methods.stakes(userAccount).call(),
            stakingContract.methods.rewardRate().call(),
            stakingContract.methods.autoCompoundingEnabled().call(),
            stakingContract.methods.referralsEnabled().call(),
            stakingContract.methods.referralRewards(userAccount).call()
        ]);

        // Update UI elements
        updateElement('y2kBalance', stakingCalculator.formatBalance(web3.utils.fromWei(y2kBalance, 'ether')));
        updateElement('stakedAmount', stakingCalculator.formatBalance(web3.utils.fromWei(stakeInfo.amount, 'ether')));
        updateElement('apyPercentage', stakingCalculator.formatAPY(rewardRate));
        updateElement('earnedRewards', stakingCalculator.calculateRewards(stakeInfo, rewardRate));
        updateElement('autoCompoundStatus', autoCompounding ? "ON" : "OFF");
        
        if (document.getElementById('stakingDuration')) {
            updateElement('stakingDuration', stakingCalculator.getDurationString(stakeInfo.startTime));
        }

        if (document.getElementById('referralStatus')) {
            updateElement('referralStatus', referralsEnabled ? "Active" : "Inactive");
            updateElement('referralRewards', stakingCalculator.formatBalance(web3.utils.fromWei(referralRewards, 'ether')));
        }

        hideLoading();
        console.log("✅ Dashboard updated successfully");

    } catch (error) {
        console.error("❌ Dashboard Update Error:", error);
        showError("Failed to update dashboard");
        hideLoading();
    }
}

// Utility Functions
async function waitForContractConfig(timeout = 5000) {
    const startTime = Date.now();
    while (!window.contractConfig && Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return window.contractConfig;
}

function verifyContracts() {
    return stakingContract?.methods && 
           pogsContract?.methods && 
           y2kContract?.methods;
}

async function checkAndSwitchNetwork() {
    const chainId = await web3.eth.getChainId();
    if (chainId !== 25) { // Cronos MainNet
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x19' }],
        });
    }
}

async function requestSignature() {
    const message = `Welcome to Y2K Staking!\n\nSign this message to verify your wallet.\n\nAddress: ${userAccount}\nTimestamp: ${Date.now()}`;
    const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [web3.utils.utf8ToHex(message), userAccount],
    });
    hasSigned = true;
    return signature;
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function showError(message) {
    alert(message); // Replace with your preferred error display method
}

function showLoading() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'none';
}

function resetWalletState() {
    userAccount = null;
    hasSigned = false;
    updateWalletButton();
    resetDashboard();
}

// Event Listeners and Setup
function setupWalletListeners() {
    if (!window.ethereum) return;

    window.ethereum.on('chainChanged', () => window.location.reload());
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('disconnect', resetWalletState);
}

async function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        resetWalletState();
    } else {
        userAccount = accounts[0];
        hasSigned = false;
        updateWalletButton();
        await updateDashboard();
    }
}

async function checkExistingConnection() {
    const accounts = await web3.eth.getAccounts();
    if (accounts.length > 0) {
        userAccount = accounts[0];
        updateWalletButton();
        await updateDashboard();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🔹 Initializing dApp...");
    await initializeWeb3();

    // Add event listeners
    document.getElementById('connectWallet')?.addEventListener('click', connectWallet);
    document.getElementById('disconnectWallet')?.addEventListener('click', resetWalletState);
});
