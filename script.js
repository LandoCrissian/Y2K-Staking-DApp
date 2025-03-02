if (typeof window.ethereum === 'undefined' && typeof window.web3 === 'undefined') {
    console.warn("⚠️ No Web3 provider detected.");
}

let web3;
let stakingContract;
let pogsContract;
let y2kContract;
let userAccount = null;
let hasSigned = false;

// Initialize Web3 & Contracts
async function initializeWeb3() {
    console.log("🔹 Initializing Web3...");

    if (window.ethereum) {
        console.log("✅ MetaMask detected.");
        web3 = new Web3(window.ethereum);
    } else {
        console.error("❌ No Web3 provider found.");
        alert("Please install MetaMask!");
        return;
    }

    try {
        console.log("🔹 Initializing contracts...");
        const contracts = await window.contractConfig.initializeContracts(web3);
        if (!contracts) throw new Error("Contract initialization failed");

        stakingContract = contracts.staking;
        pogsContract = contracts.pogs;
        y2kContract = contracts.y2k;

        console.log("✅ Contracts initialized");
        setupWalletListeners();
        
        // Check if already connected
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
            userAccount = accounts[0];
            await handleAccountConnected();
        }
    } catch (error) {
        console.error("❌ Initialization Error:", error);
        alert("Failed to initialize. Please refresh the page.");
    }
}

// Connect Wallet
async function connectWallet() {
    console.log("🔹 Connecting wallet...");

    if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length === 0) throw new Error("No accounts found");

        userAccount = accounts[0];
        await handleAccountConnected();
    } catch (error) {
        console.error("❌ Connection Error:", error);
        alert("Failed to connect wallet");
    }
}

// Handle Account Connected
async function handleAccountConnected() {
    console.log("✅ Account connected:", userAccount);
    
    // Verify network
    await window.contractConfig.networkUtils.verifyNetwork(window.ethereum);
    
    updateWalletButton();
    await updateDashboard();
}

// Update Dashboard
async function updateDashboard() {
    if (!userAccount) return;

    console.log("🔹 Updating dashboard...");
    showLoading();

    try {
        // Get Y2K Balance
        const y2kBalance = await y2kContract.methods.balanceOf(userAccount).call();
        const formattedY2kBalance = web3.utils.fromWei(y2kBalance, 'ether');
        document.getElementById('y2kBalance').textContent = parseFloat(formattedY2kBalance).toFixed(2);

        // Get Stake Info
        const stakeInfo = await stakingContract.methods.stakes(userAccount).call();
        const formattedStakedAmount = web3.utils.fromWei(stakeInfo.amount, 'ether');
        document.getElementById('stakedAmount').textContent = parseFloat(formattedStakedAmount).toFixed(2);

        // Get Staking Duration
        if (stakeInfo.startTime > 0) {
            const duration = Math.floor(Date.now() / 1000) - parseInt(stakeInfo.startTime);
            document.getElementById('stakingDuration').textContent = formatDuration(duration);
        } else {
            document.getElementById('stakingDuration').textContent = 'Not staking';
        }

        // Get Reward Rate
        const rewardRate = await stakingContract.methods.rewardRate().call();
        document.getElementById('rewardRate').textContent = `${(rewardRate / 100).toFixed(2)}%`;

        // Calculate Estimated Rewards
        if (stakeInfo.amount > 0) {
            const rewards = await window.contractConfig.stakingUtils.calculateRewards(
                stakingContract,
                userAccount,
                web3
            );
            document.getElementById('estimatedRewards').textContent = rewards;
        } else {
            document.getElementById('estimatedRewards').textContent = '0.00';
        }

        // Get Auto-Compound Status
        const isAutoCompounding = await stakingContract.methods.autoCompoundingEnabled().call();
        document.getElementById('autoCompoundStatus').textContent = isAutoCompounding ? 'Enabled' : 'Disabled';

        // Get Referral Info
        const referralsEnabled = await stakingContract.methods.referralsEnabled().call();
        const referralRewards = await stakingContract.methods.referralRewards(userAccount).call();
        
        document.getElementById('referralStatus').textContent = referralsEnabled ? 'Active' : 'Inactive';
        document.getElementById('referralRewards').textContent = web3.utils.fromWei(referralRewards, 'ether');

        hideLoading();
        console.log("✅ Dashboard updated successfully");
    } catch (error) {
        console.error("❌ Dashboard Update Error:", error);
        hideLoading();
        alert("Failed to update dashboard");
    }
}

// Staking Functions (Prepared for next implementation)
async function stake() {
    if (!userAccount) {
        alert("Please connect your wallet first");
        return;
    }

    const amount = document.getElementById('stakeAmount').value;
    const referrer = document.getElementById('referrerAddress').value || '0x0000000000000000000000000000000000000000';

    if (!amount || isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount");
        return;
    }

    // Implementation will go here
    console.log("Staking function prepared for implementation");
}

async function unstake() {
    if (!userAccount) {
        alert("Please connect your wallet first");
        return;
    }

    const amount = document.getElementById('unstakeAmount').value;

    if (!amount || isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount");
        return;
    }

    // Implementation will go here
    console.log("Unstaking function prepared for implementation");
}

async function claimRewards() {
    if (!userAccount) {
        alert("Please connect your wallet first");
        return;
    }

    // Implementation will go here
    console.log("Claim rewards function prepared for implementation");
}

// Utility Functions
function formatDuration(seconds) {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
}

function showLoading() {
    const loader = document.getElementById('loadingIndicator');
    if (loader) loader.style.display = 'block';
}

function hideLoading() {
    const loader = document.getElementById('loadingIndicator');
    if (loader) loader.style.display = 'none';
}

// Wallet Button Updates
function updateWalletButton() {
    const connectButton = document.getElementById('connectWallet');
    const disconnectButton = document.getElementById('disconnectWallet');

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

// Wallet Event Listeners
function setupWalletListeners() {
    if (!window.ethereum) return;

    window.ethereum.on('chainChanged', () => {
        window.location.reload();
    });

    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            disconnectWallet();
        } else {
            userAccount = accounts[0];
            updateWalletButton();
            updateDashboard();
        }
    });

    window.ethereum.on('disconnect', () => {
        disconnectWallet();
    });
}

// Disconnect Wallet
function disconnectWallet() {
    userAccount = null;
    hasSigned = false;
    updateWalletButton();
    resetDashboard();
}

// Reset Dashboard
function resetDashboard() {
    const elements = [
        'y2kBalance',
        'stakedAmount',
        'stakingDuration',
        'rewardRate',
        'estimatedRewards',
        'autoCompoundStatus',
        'referralStatus',
        'referralRewards'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = '0.00';
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🔹 Initializing dApp...");
    await initializeWeb3();

    // Add event listeners
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);
    
    // Prepare staking buttons (will be implemented next)
    document.getElementById('stakeButton')?.addEventListener('click', stake);
    document.getElementById('unstakeButton')?.addEventListener('click', unstake);
    document.getElementById('claimRewardsButton')?.addEventListener('click', claimRewards);
});
