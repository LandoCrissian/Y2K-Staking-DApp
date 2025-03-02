// Core Initialization Check
if (typeof window.ethereum === 'undefined' && typeof window.web3 === 'undefined') {
    console.warn("⚠️ No Web3 provider detected.");
}

// Global Variables
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

// Staking Operations
const stakingOperations = {
    MIN_STAKE_AMOUNT: '100000000000000000000', // 100 Y2K
    MAX_STAKE_AMOUNT: '60000000000000000000000000', // 60M Y2K

    async checkAndUpdateAllowance(amount) {
        showLoading("Checking allowance...");
        try {
            const allowance = await y2kContract.methods.allowance(userAccount, CONTRACT_ADDRESSES.staking).call();
            if (web3.utils.toBN(allowance).lt(web3.utils.toBN(amount))) {
                StatusUI.show("Approval needed for staking");
                await this.approveY2K(amount);
            }
            return true;
        } catch (error) {
            console.error("Allowance check failed:", error);
            return false;
        } finally {
            hideLoading();
        }
    },

    async approveY2K(amount) {
        showLoading("Approving Y2K tokens...");
        try {
            const tx = await y2kContract.methods.approve(CONTRACT_ADDRESSES.staking, amount)
                .send({ from: userAccount });
            StatusUI.show("Y2K tokens approved successfully!");
            return true;
        } catch (error) {
            console.error("Approval failed:", error);
            StatusUI.show("Failed to approve tokens", true);
            return false;
        } finally {
            hideLoading();
        }
    },

    async stake(amount) {
        if (!userAccount) {
            StatusUI.show("Please connect your wallet first", true);
            return;
        }

        try {
            const amountWei = web3.utils.toWei(amount.toString(), 'ether');

            // Validate amount
            if (web3.utils.toBN(amountWei).lt(web3.utils.toBN(this.MIN_STAKE_AMOUNT))) {
                StatusUI.show("Minimum stake amount is 100 Y2K", true);
                return;
            }

            // Check balance
            const balance = await y2kContract.methods.balanceOf(userAccount).call();
            if (web3.utils.toBN(balance).lt(web3.utils.toBN(amountWei))) {
                StatusUI.show("Insufficient Y2K balance", true);
                return;
            }

            // Check/Update allowance
            if (!await this.checkAndUpdateAllowance(amountWei)) {
                return;
            }

            // Get referrer from URL if exists
            const urlParams = new URLSearchParams(window.location.search);
            const referrer = urlParams.get('ref') || '0x0000000000000000000000000000000000000000';

            showLoading("Staking Y2K...");
            const tx = await stakingContract.methods.stake(amountWei, referrer)
                .send({ from: userAccount });

            StatusUI.show("Staking successful!");
            document.getElementById('stakeAmount').value = '';
            await updateDashboard();
            return tx;

        } catch (error) {
            console.error("Staking failed:", error);
            StatusUI.show(this.getErrorMessage(error), true);
        } finally {
            hideLoading();
        }
    },

    async unstake(amount) {
        if (!userAccount) {
            StatusUI.show("Please connect your wallet first", true);
            return;
        }

        try {
            const amountWei = web3.utils.toWei(amount.toString(), 'ether');

            // Check staked balance
            const stakeInfo = await stakingContract.methods.stakes(userAccount).call();
            if (web3.utils.toBN(stakeInfo.amount).lt(web3.utils.toBN(amountWei))) {
                StatusUI.show("Insufficient staked balance", true);
                return;
            }

            showLoading("Unstaking Y2K...");
            const tx = await stakingContract.methods.unstake(amountWei)
                .send({ from: userAccount });

            StatusUI.show("Unstaking successful!");
            document.getElementById('unstakeAmount').value = '';
            await updateDashboard();
            return tx;

        } catch (error) {
            console.error("Unstaking failed:", error);
            StatusUI.show(this.getErrorMessage(error), true);
        } finally {
            hideLoading();
        }
    },

    async claimRewards() {
        if (!userAccount) {
            StatusUI.show("Please connect your wallet first", true);
            return;
        }

        try {
            showLoading("Claiming rewards...");
            const tx = await stakingContract.methods.claimReward()
                .send({ from: userAccount });

            StatusUI.show("Rewards claimed successfully!");
            await updateDashboard();
            return tx;

        } catch (error) {
            console.error("Claim failed:", error);
            StatusUI.show(this.getErrorMessage(error), true);
        } finally {
            hideLoading();
        }
    },

    async toggleAutoCompound() {
        if (!userAccount) {
            StatusUI.show("Please connect your wallet first", true);
            return;
        }

        try {
            const currentStatus = await stakingContract.methods.autoCompoundingEnabled().call();
            showLoading("Updating auto-compound...");
            
            const tx = await stakingContract.methods.toggleAutoCompounding(!currentStatus)
                .send({ from: userAccount });

            StatusUI.show(`Auto-compound ${!currentStatus ? 'enabled' : 'disabled'}`);
            await updateDashboard();
            return tx;

        } catch (error) {
            console.error("Toggle failed:", error);
            StatusUI.show(this.getErrorMessage(error), true);
        } finally {
            hideLoading();
        }
    },

    getErrorMessage(error) {
        if (error.message.includes("User denied")) return "Transaction rejected";
        if (error.message.includes("insufficient funds")) return "Insufficient CRO for gas";
        return "Transaction failed. Please try again";
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
        setupStakingListeners();

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
        StatusUI.show(error.message, true);
        resetWalletState();
    }
}

// Dashboard Update
async function updateDashboard() {
    if (!userAccount || !isInitialized) return;

    console.log("🔹 Updating dashboard...");
    showLoading("Updating dashboard...");

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

        // Update UI elements
        updateElement('y2kBalance', stakingCalculator.formatBalance(web3.utils.fromWei(y2kBalance, 'ether')));
        updateElement('stakedAmount', stakingCalculator.formatBalance(web3.utils.fromWei(stakeInfo.amount, 'ether')));
        updateElement('apyPercentage', (rewardRate / 100).toString());
        updateElement('earnedRewards', stakingCalculator.calculateRewards(stakeInfo, rewardRate));
        
        // Update auto-compound toggle
        const autoCompoundToggle = document.getElementById('autoCompoundToggle');
        if (autoCompoundToggle) {
            autoCompoundToggle.checked = autoCompounding;
            updateElement('autoCompoundStatus', autoCompounding ? "ON" : "OFF");
        }

        // Update referral info
        if (document.getElementById('referralStatus')) {
            updateElement('referralStatus', referralsEnabled ? "Active" : "Inactive");
            updateElement('referralRewards', stakingCalculator.formatBalance(web3.utils.fromWei(referralRewards, 'ether')));
            
            // Update referral link
            const referralLink = document.getElementById('referralLink');
            if (referralLink) {
                referralLink.value = `${window.location.origin}${window.location.pathname}?ref=${userAccount}`;
            }
        }

        console.log("✅ Dashboard updated successfully");
    } catch (error) {
        console.error("❌ Dashboard Update Error:", error);
        StatusUI.show("Failed to update some dashboard elements", true);
    } finally {
        hideLoading();
    }
}

// Event Listeners Setup
function setupStakingListeners() {
    // Max Buttons
    document.getElementById('maxStake')?.addEventListener('click', async () => {
        if (!userAccount) return;
        try {
            const balance = await y2kContract.methods.balanceOf(userAccount).call();
            document.getElementById('stakeAmount').value = web3.utils.fromWei(balance, 'ether');
        } catch (error) {
            console.error("Error setting max stake:", error);
        }
    });

    document.getElementById('maxUnstake')?.addEventListener('click', async () => {
        if (!userAccount) return;
        try {
            const stakeInfo = await stakingContract.methods.stakes(userAccount).call();
            document.getElementById('unstakeAmount').value = web3.utils.fromWei(stakeInfo.amount, 'ether');
        } catch (error) {
            console.error("Error setting max unstake:", error);
        }
    });

    // Staking Actions
    document.getElementById('stakeButton')?.addEventListener('click', async () => {
        const amount = document.getElementById('stakeAmount').value;
        if (!amount || isNaN(amount) || amount <= 0) {
            StatusUI.show("Please enter a valid amount", true);
            return;
        }
        await stakingOperations.stake(amount);
    });

    document.getElementById('unstakeButton')?.addEventListener('click', async () => {
        const amount = document.getElementById('unstakeAmount').value;
        if (!amount || isNaN(amount) || amount <= 0) {
            StatusUI.show("Please enter a valid amount", true);
            return;
        }
        await stakingOperations.unstake(amount);
    });

    // Claim Rewards
    document.getElementById('claimRewards')?.addEventListener('click', async () => {
        await stakingOperations.claimRewards();
    });

        // Auto-compound Toggle
    document.getElementById('autoCompoundToggle')?.addEventListener('change', async (e) => {
        await stakingOperations.toggleAutoCompound();
    });

    // Referral Link Copy
    document.querySelector('button[onclick="copyReferralLink()"]')?.addEventListener('click', async () => {
        const referralLink = document.getElementById('referralLink');
        if (!referralLink) return;

        try {
            await navigator.clipboard.writeText(referralLink.value);
            StatusUI.show("Referral link copied!");
        } catch (error) {
            console.error("Copy failed:", error);
            StatusUI.show("Failed to copy link", true);
        }
    });
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

// Wallet Button Updates
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

// State Management
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

// Wallet Event Listeners
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
