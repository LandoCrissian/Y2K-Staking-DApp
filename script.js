if (typeof window.ethereum === 'undefined' && typeof window.web3 === 'undefined') {
    console.warn("⚠️ No Web3 provider detected.");
}

let web3;
let stakingContract;
let pogsContract;
let y2kContract;
let userAccount = null;
let hasSigned = false;

// Staking Calculator Utilities
const stakingCalculator = {
    calculateAPY: function(rewardRate) {
        // RewardRate is in basis points (1/100th of a percent)
        return (rewardRate / 100).toFixed(2);
    },

    calculateRewards: function(stakeInfo, rewardRate) {
        if (!stakeInfo.amount || stakeInfo.amount === '0') return '0';

        const stakedAmount = web3.utils.fromWei(stakeInfo.amount, 'ether');
        const lastCompoundTime = parseInt(stakeInfo.lastCompoundTime);
        const currentTime = Math.floor(Date.now() / 1000);
        const duration = currentTime - lastCompoundTime;

        // Calculate rewards based on contract formula
        // (stakeInfo.amount * stakedDuration * rewardRate) / 1e18
        const rawReward = (parseFloat(stakedAmount) * duration * (rewardRate / 1e18));
        
        // Apply burn rate (10% by default in contract)
        const burnRate = 10;
        const netReward = rawReward * (1 - (burnRate / 100));

        return netReward.toFixed(4);
    },

    formatNumber: function(number) {
        if (number > 1000000) {
            return Number(number).toExponential(2);
        }
        return Number(number).toLocaleString('en-US', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        });
    }
};

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

// Connect Wallet with Signature
async function connectWallet() {
    console.log("🔹 Attempting wallet connection...");

    if (!window.ethereum) {
        alert("MetaMask is not installed. Please install it to continue.");
        return;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (accounts.length === 0) {
            alert("Wallet connection failed. No accounts found.");
            return;
        }

        userAccount = accounts[0];
        console.log("✅ Wallet connected:", userAccount);

        if (!hasSigned) {
            const message = `Welcome to Y2K Staking!\n\nSign this message to verify your wallet.\n\nAddress: ${userAccount}\nTimestamp: ${Date.now()}`;
            try {
                const signature = await window.ethereum.request({
                    method: 'personal_sign',
                    params: [web3.utils.utf8ToHex(message), userAccount],
                });

                console.log("✅ Signature Verified:", signature);
                hasSigned = true;
                
                updateWalletButton();
                await updateDashboard();
            } catch (signError) {
                console.error("❌ Signature Error:", signError);
                userAccount = null;
                alert("Signature required to connect wallet.");
                return;
            }
        }
    } catch (error) {
        console.error("❌ Wallet Connection Error:", error);
        alert("Failed to connect wallet.");
    }
}

// Update Dashboard
async function updateDashboard() {
    if (!userAccount) return;

    console.log("🔹 Updating Dashboard...");
    showLoading();

    try {
        // Get Y2K Balance
        const y2kBalance = await y2kContract.methods.balanceOf(userAccount).call();
        document.getElementById('y2kBalance').textContent = 
            stakingCalculator.formatNumber(web3.utils.fromWei(y2kBalance, 'ether'));

        // Get Stake Info
        const stakeInfo = await stakingContract.methods.stakes(userAccount).call();
        document.getElementById('stakedAmount').textContent = 
            stakingCalculator.formatNumber(web3.utils.fromWei(stakeInfo.amount, 'ether'));

        // Get Reward Rate and Calculate APY
        const rewardRate = await stakingContract.methods.rewardRate().call();
        const apy = stakingCalculator.calculateAPY(rewardRate);
        document.getElementById('apyPercentage').textContent = apy;

        // Calculate Estimated Rewards
        const estimatedRewards = stakingCalculator.calculateRewards(stakeInfo, rewardRate);
        document.getElementById('earnedRewards').textContent = estimatedRewards;

        // Get Auto-compound Status
        const isAutoCompounding = await stakingContract.methods.autoCompoundingEnabled().call();
        document.getElementById('autoCompoundStatus').textContent = isAutoCompounding ? "ON" : "OFF";

        // Get Referral Status and Rewards
        const referralsEnabled = await stakingContract.methods.referralsEnabled().call();
        if (document.getElementById('referralStatus')) {
            document.getElementById('referralStatus').textContent = referralsEnabled ? "Active" : "Inactive";
        }

        const referralRewards = await stakingContract.methods.referralRewards(userAccount).call();
        if (document.getElementById('referralRewards')) {
            document.getElementById('referralRewards').textContent = 
                stakingCalculator.formatNumber(web3.utils.fromWei(referralRewards, 'ether'));
        }

        hideLoading();
        console.log("✅ Dashboard Updated Successfully");
    } catch (error) {
        console.error("❌ Dashboard Update Error:", error);
        hideLoading();
    }
}

// Wallet Event Listeners
function setupWalletListeners() {
    if (!window.ethereum) return;

    window.ethereum.on('chainChanged', () => {
        console.warn("🔄 Chain changed, reloading...");
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
        console.warn("🔌 Wallet disconnected.");
        disconnectWallet();
    });
}

// Disconnect Wallet
function disconnectWallet() {
    console.log("🔌 Disconnecting wallet...");
    userAccount = null;
    hasSigned = false;
    updateWalletButton();
    resetDashboard();
}

// Update Wallet Button
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

// Reset Dashboard
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

// Loading handlers
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🔹 Initializing dApp...");
    await initializeWeb3();

    // Add event listeners
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);
});
