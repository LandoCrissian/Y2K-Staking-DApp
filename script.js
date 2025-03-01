if (typeof window.ethereum === 'undefined' && typeof window.web3 === 'undefined') {
    console.warn("⚠️ No Web3 provider detected. Attempting manual connection...");
}

let web3;
let stakingContract;
let pogsContract;
let y2kContract;
let userAccount;
let isWalletConnected = false;

// 🚀 **Wait for Contract Config**
function waitForContractConfig() {
    return new Promise((resolve) => {
        if (window.contractConfig) {
            resolve(window.contractConfig);
            return;
        }

        const checkConfig = setInterval(() => {
            if (window.contractConfig) {
                clearInterval(checkConfig);
                resolve(window.contractConfig);
            }
        }, 100);

        setTimeout(() => {
            clearInterval(checkConfig);
            resolve(null);
        }, 5000);
    });
}

// 🚀 **Initialize Web3 & Contracts**
async function initializeWeb3() {
    console.log("🔹 Initializing Web3...");

    if (window.ethereum) {
        console.log("✅ Detected MetaMask or a compatible provider.");
        web3 = new Web3(window.ethereum);
    } else if (window.web3) {
        console.log("✅ Detected legacy Web3 provider.");
        web3 = new Web3(window.web3.currentProvider);
    } else {
        console.error("❌ No Web3 provider detected.");
        alert("No Web3 provider found. Please use a Web3-compatible wallet.");
        return;
    }

    try {
        console.log("🔹 Initializing contracts...");
        const contracts = await initializeContracts(web3);
        if (!contracts) throw new Error("Failed to initialize contracts.");

        stakingContract = contracts.staking;
        pogsContract = contracts.pogs;
        y2kContract = contracts.y2k;

        console.log("✅ Web3 and contracts initialized.");
        console.log("🔹 Staking Contract:", stakingContract._address);
        console.log("🔹 POGS Contract:", pogsContract._address);
        console.log("🔹 Y2K Contract:", y2kContract._address);

        setupWalletListeners();

    } catch (error) {
        console.error("❌ Initialization error:", error);
        alert(error.message || "Failed to initialize Web3.");
    }
}

// 🔗 **Connect Wallet with Signature Verification**
async function connectWallet() {
    if (!window.ethereum) {
        alert("MetaMask is not detected! Please install MetaMask.");
        return;
    }

    try {
        const config = await waitForContractConfig();
        if (!config) {
            throw new Error("DApp not properly initialized.");
        }

        await config.networkUtils.verifyNetwork(window.ethereum);

        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });

        if (accounts.length > 0) {
            userAccount = accounts[0];

            const message = `Welcome to Y2K Staking!\n\nAddress: ${userAccount}\n\nSign to verify your wallet.`;
            try {
                const signature = await window.ethereum.request({
                    method: 'personal_sign',
                    params: [web3.utils.utf8ToHex(message), userAccount],
                });

                console.log("✅ Signature Verified:", signature);
                alert("Signature verified! Wallet successfully connected.");
                
                isWalletConnected = true;
                updateWalletButton();
                await updateUI();
            } catch (signError) {
                console.error("❌ Signature rejected:", signError);
                alert("You must sign the message to connect your wallet.");
            }
        }
    } catch (error) {
        console.error("❌ Connection error:", error);
        alert(error.message);
    }
}

// 🌐 **Handle Chain & Account Changes**
function setupWalletListeners() {
    if (!window.ethereum) return;

    window.ethereum.on("chainChanged", () => {
        console.warn("🔄 Chain changed, reloading...");
        window.location.reload();
    });

    window.ethereum.on("accountsChanged", (accounts) => {
        console.log("🔄 Accounts changed:", accounts);
        if (accounts.length === 0) {
            disconnectWallet();
        } else if (accounts[0] !== userAccount) {
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
    userAccount = null;
    isWalletConnected = false;
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
    document.getElementById('referralLink').value = '';
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
        console.log("🔍 Fetching user staking info...");

        let y2kBalance, stakeInfo, totalStaked, earnedRewards, autoCompoundStatus;

        try {
            y2kBalance = await y2kContract.methods.balanceOf(userAccount).call();
            document.getElementById('y2kBalance').textContent = web3.utils.fromWei(y2kBalance);
            console.log("✅ Y2K Balance:", y2kBalance);
        } catch (error) {
            console.error("❌ Error fetching Y2K balance:", error);
        }

        try {
            stakeInfo = await stakingContract.methods.stakes(userAccount).call();
            document.getElementById('stakedAmount').textContent = web3.utils.fromWei(stakeInfo.amount);
            console.log("✅ Staked Amount:", stakeInfo.amount);
        } catch (error) {
            console.error("❌ Error fetching staking info:", error);
        }

        try {
            totalStaked = await stakingContract.methods.totalStaked().call();
            document.getElementById('totalStaked').textContent = web3.utils.fromWei(totalStaked);
            console.log("✅ Total Y2K Staked:", totalStaked);
        } catch (error) {
            console.error("❌ Error fetching total staked:", error);
        }

        try {
            earnedRewards = await stakingContract.methods.earned(userAccount).call();
            document.getElementById('earnedRewards').textContent = web3.utils.fromWei(earnedRewards);
            console.log("✅ Earned Rewards:", earnedRewards);
        } catch (error) {
            console.error("❌ Error fetching earned rewards:", error);
        }

        hideLoading();
    } catch (error) {
        console.error("❌ General UI update error:", error);
        hideLoading();
        alert("Failed to update dashboard.");
    }
}

// 🔄 **Initialize DApp on Load**
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM loaded, initializing...");
    await initializeWeb3();
});
