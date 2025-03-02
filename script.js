if (typeof window.ethereum === 'undefined' && typeof window.web3 === 'undefined') {
    console.warn("⚠️ No Web3 provider detected.");
}

let web3;
let stakingContract;
let pogsContract;
let y2kContract;
let userAccount = null;
let hasSigned = false;  // ✅ Prevents duplicate signature prompts

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
        const contracts = await window.contractConfig.initializeContracts(web3);
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

        if (!hasSigned) {  
            const message = `Welcome to Y2K Staking!\n\nSign this message to verify your wallet.\n\nAddress: ${userAccount}`;
            try {
                const signature = await window.ethereum.request({
                    method: 'personal_sign',
                    params: [web3.utils.utf8ToHex(message), userAccount],
                });

                console.log("✅ Signature Verified:", signature);
                alert("Wallet connected and verified!");
                hasSigned = true;

                updateWalletButton();
                await updateUI();
            } catch (signError) {
                console.error("❌ Signature Error:", signError);
                if (userAccount) {
                    console.warn("⚠️ Signature declined, but wallet remains connected.");
                } else {
                    alert("Signature declined. Please sign the message to connect your wallet.");
                    hasSigned = false;
                }
            }
        } else {
            console.log("✅ Signature already verified, skipping redundant request.");
            updateWalletButton();
            await updateUI();
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
    hasSigned = false; 
    updateWalletButton();
    resetUI();
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

// 🔄 **Update Dashboard UI**
async function updateUI() {
    if (!userAccount) return;

    try {
        showLoading("Updating dashboard...");

        const y2kBalance = await y2kContract.methods.balanceOf(userAccount).call();
        document.getElementById('y2kBalance').textContent = web3.utils.fromWei(y2kBalance);

        const stakeInfo = await stakingContract.methods.stakes(userAccount).call();
        document.getElementById('stakedAmount').textContent = web3.utils.fromWei(stakeInfo.amount);

        const totalStaked = await stakingContract.methods.totalStaked().call();
        document.getElementById('totalStaked').textContent = web3.utils.fromWei(totalStaked);

        hideLoading();
    } catch (error) {
        console.error("❌ UI Update Error:", error);
        hideLoading();
        alert("Failed to update dashboard.");
    }
}

// ✅ **Stake Y2K**
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

        // Check Allowance
        const allowance = await y2kContract.methods.allowance(userAccount, stakingContract._address).call();
        if (BigInt(allowance) < BigInt(weiAmount)) {
            await y2kContract.methods.approve(stakingContract._address, weiAmount).send({ from: userAccount });
        }

        await stakingContract.methods.stake(weiAmount, "0x0000000000000000000000000000000000000000").send({ from: userAccount });

        alert("✅ Successfully staked Y2K!");
        updateUI();
    } catch (error) {
        console.error("❌ Stake Error:", error);
        alert("Failed to stake Y2K.");
    } finally {
        hideLoading();
    }
}

// ✅ **Unstake Y2K**
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

        await stakingContract.methods.unstake(weiAmount).send({ from: userAccount });

        alert("✅ Successfully unstaked Y2K!");
        updateUI();
    } catch (error) {
        console.error("❌ Unstake Error:", error);
        alert("Failed to unstake Y2K.");
    } finally {
        hideLoading();
    }
}

// ✅ **Max Buttons**
async function setMaxStake() {
    try {
        const balance = await y2kContract.methods.balanceOf(userAccount).call();
        document.getElementById('stakeAmount').value = web3.utils.fromWei(balance);
    } catch (error) {
        console.error("❌ Error fetching balance:", error);
    }
}

async function setMaxUnstake() {
    try {
        const stakeInfo = await stakingContract.methods.stakes(userAccount).call();
        document.getElementById('unstakeAmount').value = web3.utils.fromWei(stakeInfo.amount);
    } catch (error) {
        console.error("❌ Error fetching staked amount:", error);
    }
}

// 🔄 **Initialize DApp on Load**
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM loaded, initializing...");
    await initializeWeb3();
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);
});
