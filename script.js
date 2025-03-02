// Web3 and Contract Initialization Check
if (typeof window.ethereum === 'undefined' && typeof window.web3 === 'undefined') {
    console.warn("⚠️ No Web3 provider detected.");
}

// Global Variables with Clear Initialization
let web3 = null;
let stakingContract = null;
let pogsContract = null;
let y2kContract = null;
let userAccount = null;
let hasSigned = false;
let isInitialized = false;

// Enhanced Staking Calculator
const stakingCalculator = {
    formatBalance: function(amount) {
        try {
            const num = parseFloat(amount);
            if (isNaN(num)) return '0.00';
            if (num === 0) return '0.00';
            if (num < 0.01) return '<0.01';
            if (num < 1000) return num.toFixed(2);
            if (num < 1000000) {
                return num.toLocaleString('en-US', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                });
            }
            if (num < 1000000000) {
                return `${(num / 1000000).toFixed(2)}M`;
            }
            return `${(num / 1000000000).toFixed(2)}B`;
        } catch (error) {
            console.error("Format balance error:", error);
            return '0.00';
        }
    },

    calculateRewards: function(stakeInfo, rewardRate) {
        if (!stakeInfo.amount || stakeInfo.amount === '0') return '0.00';

        try {
            const stakedAmount = web3.utils.fromWei(stakeInfo.amount, 'ether');
            const lastCompoundTime = parseInt(stakeInfo.lastCompoundTime);
            const currentTime = Math.floor(Date.now() / 1000);
            const duration = currentTime - lastCompoundTime;
            const rawReward = (parseFloat(stakedAmount) * duration * (rewardRate / 1e18));
            const burnRate = 10;
            const netReward = rawReward * (1 - (burnRate / 100));
            return this.formatBalance(netReward);
        } catch (error) {
            console.error("Reward calculation error:", error);
            return '0.00';
        }
    }
};

// Initialize Web3 and Contracts
async function initializeWeb3() {
    console.log("🔹 Starting Web3 initialization...");

    try {
        if (!window.ethereum) {
            throw new Error("Please install MetaMask!");
        }

        web3 = new Web3(window.ethereum);
        
        // Wait for contract config
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

// Wallet Connection Handler
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

// Dashboard Update Function
async function updateDashboard() {
    if (!userAccount || !isInitialized) return;

    console.log("🔹 Updating dashboard...");
    showLoading();

    try {
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

        // Update UI elements safely
        updateElement('y2kBalance', stakingCalculator.formatBalance(web3.utils.fromWei(y2kBalance, 'ether')));
        updateElement('stakedAmount', stakingCalculator.formatBalance(web3.utils.fromWei(stakeInfo.amount, 'ether')));
        updateElement('apyPercentage', (rewardRate / 100).toString());
        updateElement('earnedRewards', stakingCalculator.calculateRewards(stakeInfo, rewardRate));
        updateElement('autoCompoundStatus', autoCompounding ? "ON" : "OFF");
        
        // Update optional elements
        if (document.getElementById('referralStatus')) {
            updateElement('referralStatus', referralsEnabled ? "Active" : "Inactive");
            updateElement('referralRewards', stakingCalculator.formatBalance(web3.utils.fromWei(referralRewards, 'ether')));
        }

        hideLoading();
        console.log("✅ Dashboard updated successfully");

    } catch (error) {
        console.error("❌ Dashboard Update Error:", error);
        hideLoading();
    }
}

// UI Update Functions
function updateWalletButton() {
    const connectButton = document.getElementById('connectWallet');
    const disconnectButton = document.getElementById('disconnectWallet');

    if (!connectButton || !disconnectButton) {
        console.error("Wallet buttons not found");
        return;
    }

    try {
        if (userAccount) {
            connectButton.textContent = `${userAccount.substring(0, 6)}...${userAccount.substring(38)}`;
            connectButton.classList.add('connected');
            disconnectButton.style.display = 'inline-block';
        } else {
            connectButton.textContent = 'Connect Wallet';
            connectButton.classList.remove('connected');
            disconnectButton.style.display = 'none';
        }
    } catch (error) {
        console.error("Error updating wallet button:", error);
    }
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
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

// State Management Functions
function resetWalletState() {
    userAccount = null;
    hasSigned = false;
    updateWalletButton();
    resetDashboard();
}

function resetDashboard() {
    const elements = [
        'y2kBalance',
        'stakedAmount',
        'apyPercentage',
        'earnedRewards',
        'autoCompoundStatus',
        'referralStatus',
        'referralRewards'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = '0.00';
    });
}

// UI Feedback Functions
function showLoading() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'none';
}

function showError(message) {
    console.error(message);
    alert(message);
}

// Event Listeners
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
    try {
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
            userAccount = accounts[0];
            updateWalletButton();
            await updateDashboard();
        }
    } catch (error) {
        console.error("Error checking existing connection:", error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🔹 Initializing dApp...");
    
    const connectButton = document.getElementById('connectWallet');
    const disconnectButton = document.getElementById('disconnectWallet');

    if (!connectButton || !disconnectButton) {
        console.error("Required buttons not found in DOM");
        return;
    }

    await initializeWeb3();

    connectButton.addEventListener('click', connectWallet);
    disconnectButton.addEventListener('click', resetWalletState);
});
