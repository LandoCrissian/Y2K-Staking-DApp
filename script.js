if (typeof window.ethereum === 'undefined' && typeof window.web3 === 'undefined') {
    console.warn("⚠️ No Web3 provider detected.");
}

let web3;
let stakingContract;
let pogsContract;
let y2kContract;
let userAccount = null;

// 🚀 **Initialize Web3 & Contracts**
async function initializeWeb3() {
    console.log("🔹 Initializing Web3...");

    if (window.ethereum) {
        console.log("✅ MetaMask (or Web3 provider) detected.");
        web3 = new Web3(window.ethereum);
    } else {
        console.error("❌ No Web3 provider found.");
        alert("No Web3 provider detected. Please install MetaMask or use a Web3-compatible browser.");
        return;
    }

    try {
        console.log("🔹 Fetching contract configurations...");
        const contracts = await initializeContracts(web3);
        if (!contracts) throw new Error("Failed to load contracts.");

        stakingContract = contracts.staking;
        pogsContract = contracts.pogs;
        y2kContract = contracts.y2k;

        console.log("✅ Contracts initialized successfully.");
        setupWalletListeners();
    } catch (error) {
        console.error("❌ Contract Initialization Error:", error);
        alert(error.message || "Failed to initialize contracts.");
    }
}

// 🔗 **Connect Wallet with Signature Verification**
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

        // 📢 **Fixed the Signature Message**
        const message = `Welcome to Y2K Staking!\n\nSign this message to verify your wallet.\n\nAddress: ${userAccount}`;
        try {
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [web3.utils.utf8ToHex(message), userAccount],
            });

            console.log("✅ Signature Verified:", signature);
            alert("Wallet connected and verified!");

            updateWalletButton();
            await updateUI();
        } catch (signError) {
            console.error("❌ Signature Error:", signError);
            alert("Signature declined. Please sign the message to connect your wallet.");
        }
    } catch (error) {
        console.error("❌ Wallet Connection Error:", error);
        alert("Failed to connect wallet.");
    }
}

// 🔄 **Handle Wallet Events**
function setupWalletListeners() {
    if (!window.ethereum) return;

    window.ethereum.on("chainChanged", () => {
        console.warn("🔄 Chain changed, reloading...");
        window.location.reload();
    });

    window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
            disconnectWallet();
        } else {
            userAccount = accounts[0];
            updateWalletButton();
            updateUI();
        }
    });

    window.ethereum.on("disconnect", () => {
        console.warn("🔌 Wallet disconnected.");
        disconnectWallet();
    });
}

// 🔌 **Disconnect Wallet**
function disconnectWallet() {
    console.log("🔌 Disconnecting wallet...");
    userAccount = null;
    updateWalletButton();
    resetUI();
}

// 🔄 **Reset UI**
function resetUI() {
    document.getElementById('stakedAmount').textContent = '0';
    document.getElementById('burnedRewards').textContent = '0';
    document.getElementById('apyPercentage').textContent = '0';
    document.getElementById('totalStaked').textContent = '0';
    document.getElementById('earnedRewards').textContent = '0';
    document.getElementById('y2kBalance').textContent = '0';
    document.getElementById('autoCompoundStatus').textContent = 'OFF';
    document.getElementById('autoCompoundToggle').checked = false;
}

// 🔄 **Update Wallet Button**
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

// 🔄 **Update UI with Data**
async function updateUI() {
    if (!userAccount) return;

    try {
        showLoading("Updating dashboard...");

        let y2kBalance, stakeInfo, totalStaked, earnedRewards, autoCompoundStatus;

        try {
            y2kBalance = await y2kContract.methods.balanceOf(userAccount).call();
            document.getElementById('y2kBalance').textContent = web3.utils.fromWei(y2kBalance);
        } catch (error) {
            console.error("❌ Error fetching Y2K balance:", error);
        }

        try {
            stakeInfo = await stakingContract.methods.stakes(userAccount).call();
            document.getElementById('stakedAmount').textContent = web3.utils.fromWei(stakeInfo.amount);
        } catch (error) {
            console.error("❌ Error fetching staking info:", error);
        }

        try {
            totalStaked = await stakingContract.methods.totalStaked().call();
            document.getElementById('totalStaked').textContent = web3.utils.fromWei(totalStaked);
        } catch (error) {
            console.error("❌ Error fetching total staked:", error);
        }

        try {
            earnedRewards = await stakingContract.methods.earned(userAccount).call();
            document.getElementById('earnedRewards').textContent = web3.utils.fromWei(earnedRewards);
        } catch (error) {
            console.error("❌ Error fetching earned rewards:", error);
        }

        hideLoading();
    } catch (error) {
        console.error("❌ UI Update Error:", error);
        hideLoading();
        alert("Failed to update dashboard.");
    }
}
// ✅ **Stake Y2K Tokens**
async function stakeTokens() {
    const amount = document.getElementById('stakeAmount').value;
    if (!amount || isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount to stake.");
        return;
    }

    try {
        showLoading("Staking tokens...");

        const amountInWei = web3.utils.toWei(amount.toString(), 'ether');

        // Step 1: Approve Y2K Contract to spend the amount
        await y2kContract.methods.approve(stakingContract._address, amountInWei).send({ from: userAccount });

        // Step 2: Stake Y2K in Staking Contract
        await stakingContract.methods.stake(amountInWei).send({ from: userAccount });

        alert(`✅ Successfully staked ${amount} Y2K!`);
        await updateUI();
    } catch (error) {
        console.error("❌ Staking Error:", error);
        alert("Failed to stake Y2K.");
    } finally {
        hideLoading();
    }
}

// ✅ **Unstake Y2K Tokens**
async function unstakeTokens() {
    const amount = document.getElementById('unstakeAmount').value;
    if (!amount || isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount to unstake.");
        return;
    }

    try {
        showLoading("Unstaking tokens...");

        const amountInWei = web3.utils.toWei(amount.toString(), 'ether');

        // Withdraw from Staking Contract
        await stakingContract.methods.withdraw(amountInWei).send({ from: userAccount });

        alert(`✅ Successfully unstaked ${amount} Y2K!`);
        await updateUI();
    } catch (error) {
        console.error("❌ Unstaking Error:", error);
        alert("Failed to unstake Y2K.");
    } finally {
        hideLoading();
    }
}

// ✅ **Max Stake Button**
async function setMaxStake() {
    try {
        const balance = await y2kContract.methods.balanceOf(userAccount).call();
        document.getElementById('stakeAmount').value = web3.utils.fromWei(balance);
    } catch (error) {
        console.error("❌ Error fetching balance:", error);
    }
}

// ✅ **Max Unstake Button**
async function setMaxUnstake() {
    try {
        const stakeInfo = await stakingContract.methods.stakes(userAccount).call();
        document.getElementById('unstakeAmount').value = web3.utils.fromWei(stakeInfo.amount);
    } catch (error) {
        console.error("❌ Error fetching staked amount:", error);
    }
}

// 🔄 **Loading Overlay Functions**
function showLoading(message) {
    const overlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    if (overlay && loadingMessage) {
        loadingMessage.textContent = message;
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// 🏆 **Copy Referral Link**
function copyReferralLink() {
    const referralLink = document.getElementById('referralLink');
    referralLink.select();
    document.execCommand('copy');
    alert('Referral link copied!');
}

// 🔄 **Initialize DApp on Load**
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM loaded, initializing...");
    await initializeWeb3();

    // Bind event listeners
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);

    // Bind staking/unstaking buttons
    document.getElementById('stakeButton').addEventListener('click', stakeTokens);
    document.getElementById('unstakeButton').addEventListener('click', unstakeTokens);
    document.getElementById('maxStake').addEventListener('click', setMaxStake);
    document.getElementById('maxUnstake').addEventListener('click', setMaxUnstake);
});
