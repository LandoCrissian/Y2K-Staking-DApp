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

// 🔄 **Stake Y2K Tokens**
async function stakeY2K() {
    if (!userAccount) {
        alert("Connect your wallet first.");
        return;
    }

    const amount = document.getElementById('stakeAmount').value;
    if (!amount || parseFloat(amount) <= 0) {
        alert("Enter a valid Y2K amount to stake.");
        return;
    }

    try {
        showLoading("Staking Y2K...");

        const weiAmount = web3.utils.toWei(amount, "ether");

        // **Check Allowance Before Staking**
        const allowance = await y2kContract.methods.allowance(userAccount, stakingContract._address).call();
        if (BigInt(allowance) < BigInt(weiAmount)) {
            console.log("🔹 Approving Y2K for staking...");
            await y2kContract.methods.approve(stakingContract._address, weiAmount).send({ from: userAccount });
        }

        console.log("🔹 Sending stake transaction...");
        await stakingContract.methods.stake(weiAmount).send({ from: userAccount });

        alert("✅ Successfully staked Y2K!");
        updateUI();
    } catch (error) {
        console.error("❌ Stake Error:", error);
        alert("Failed to stake Y2K:\n" + error.message);
    } finally {
        hideLoading();
    }
}

// 🔄 **Unstake Y2K Tokens**
async function unstakeY2K() {
    if (!userAccount) {
        alert("Connect your wallet first.");
        return;
    }

    const amount = document.getElementById('unstakeAmount').value;
    if (!amount || parseFloat(amount) <= 0) {
        alert("Enter a valid Y2K amount to unstake.");
        return;
    }

    try {
        showLoading("Unstaking Y2K...");

        const weiAmount = web3.utils.toWei(amount, "ether");

        console.log("🔹 Sending unstake transaction...");
        await stakingContract.methods.unstake(weiAmount).send({ from: userAccount });

        alert("✅ Successfully unstaked Y2K!");
        updateUI();
    } catch (error) {
        console.error("❌ Unstake Error:", error);
        alert("Failed to unstake Y2K:\n" + error.message);
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

// 🔄 **Initialize DApp on Load**
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM loaded, initializing...");
    await initializeWeb3();

    // Bind event listeners
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);

    // Bind staking/unstaking buttons
    document.getElementById('stakeButton').addEventListener('click', stakeY2K);
    document.getElementById('unstakeButton').addEventListener('click', unstakeY2K);
    document.getElementById('maxStake').addEventListener('click', setMaxStake);
    document.getElementById('maxUnstake').addEventListener('click', setMaxUnstake);
});
