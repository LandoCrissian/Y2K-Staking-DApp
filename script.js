// Core Initialization and Configuration
if (typeof window.ethereum === 'undefined' && typeof window.web3 === 'undefined') {
    console.warn("⚠️ No Web3 provider detected.");
}

let web3 = null;
let stakingContract = null;
let pogsContract = null;
let y2kContract = null;
let userAccount = null;
let hasSigned = false;
let isInitialized = false;

// Status Display Handler
const StatusUI = {
    show: function(message, isError = false) {
        const statusDiv = document.getElementById('statusMessage') || this.createStatusElement();
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${isError ? 'error' : 'info'}`;
        statusDiv.style.display = 'block';
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    },

    createStatusElement: function() {
        const div = document.createElement('div');
        div.id = 'statusMessage';
        div.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px;
            border-radius: 5px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            z-index: 1000;
            display: none;
        `;
        document.body.appendChild(div);
        return div;
    }
};

// Number Formatting Utility
const stakingCalculator = {
    formatBalance: function(amount) {
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
        StatusUI.show("Ready to connect wallet");

    } catch (error) {
        console.error("❌ Initialization Error:", error);
        StatusUI.show(error.message, true);
    }
}

// Wallet Connection Handler
async function connectWallet() {
    if (!isInitialized) {
        StatusUI.show("Please wait for initialization to complete", true);
        return;
    }

    showLoading("Connecting wallet...");
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
            showLoading("Please sign to verify...");
            await requestSignature();
        }

        updateWalletButton();
        await updateDashboard();
        StatusUI.show("Wallet connected successfully");

    } catch (error) {
        console.error("❌ Connection Error:", error);
        StatusUI.show(error.message, true);
        resetWalletState();
    } finally {
        hideLoading();
    }
}

// Dashboard Update Function
async function updateDashboard() {
    if (!userAccount || !isInitialized) return;

    showLoading("Updating dashboard...");
    console.log("🔹 Updating dashboard...");

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

        updateElement('y2kBalance', stakingCalculator.formatBalance(web3.utils.fromWei(y2kBalance, 'ether')));
        updateElement('stakedAmount', stakingCalculator.formatBalance(web3.utils.fromWei(stakeInfo.amount, 'ether')));
        updateElement('apyPercentage', (rewardRate / 100).toString());
        updateElement('earnedRewards', stakingCalculator.calculateRewards(stakeInfo, rewardRate));
        updateElement('autoCompoundStatus', autoCompounding ? "ON" : "OFF");

        if (document.getElementById('referralStatus')) {
            updateElement('referralStatus', referralsEnabled ? "Active" : "Inactive");
            updateElement('referralRewards', stakingCalculator.formatBalance(web3.utils.fromWei(referralRewards, 'ether')));
        }

        console.log("✅ Dashboard updated successfully");
    } catch (error) {
        console.error("❌ Dashboard Update Error:", error);
        StatusUI.show("Failed to update dashboard", true);
    } finally {
        hideLoading();
    }
}

// UI Update Functions
function updateWalletButton() {
    const connectButton = document.getElementById('connectWallet');
    const disconnectButton = document.getElementById('disconnectWallet');

    if (!connectButton || !disconnectButton) return;

    if (userAccount) {
        connectButton.textContent = `${userAccount.substring(0, 6)}...${userAccount.substring(38)}`;
        connectButton.classList.add('connected');
        disconnectButton.style.display = 'inline-block';
    } else {
        connectButton.textContent = 'Connect Wallet';
        connectButton.classList.remove('connected');
        disconnectButton.style.display = 'none';
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
    if (chainId !== 25) {
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

// State Management
function resetWalletState() {
    userAccount = null;
    hasSigned = false;
    updateWalletButton();
    resetDashboard();
    StatusUI.show("Wallet disconnected");
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

// Loading State Management
function showLoading(message = "Loading...") {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) loadingMessage.textContent = message;
        loader.style.display = 'flex';
    }
}

function hideLoading() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'none';
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
