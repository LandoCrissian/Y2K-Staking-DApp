if (typeof window.ethereum === 'undefined' && typeof window.web3 === 'undefined') {
    console.warn("⚠️ No Web3 provider detected. Attempting manual connection...");
}

let web3;
let stakingContract;
let pogsContract;
let y2kContract;
let userAccount;

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
        setupWalletListeners();
    } catch (error) {
        console.error("❌ Initialization error:", error);
        alert(error.message || "Failed to initialize Web3.");
    }
}

// 🌐 **Handle Chain & Account Changes**
function handleChainChanged() {
    window.location.reload();
}

function handleAccountsChanged(accounts) {
    console.log("Accounts changed:", accounts);
    if (accounts.length === 0) {
        disconnectWallet();
    } else if (accounts[0] !== userAccount) {
        userAccount = accounts[0];
        updateWalletButton();
        updateUI();
    }
}

function handleDisconnect() {
    disconnectWallet();
}

// 🔌 **Disconnect Wallet**
function disconnectWallet() {
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

// 🔗 **Connect Wallet with Signature Verification**
async function connectWallet() {
    try {
        if (!window.ethereum) {
            throw new Error("Please install MetaMask!");
        }

        const config = await waitForContractConfig();
        if (!config) {
            throw new Error("DApp not properly initialized.");
        }

        await config.networkUtils.verifyNetwork(window.ethereum);

        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });

        if (accounts.length > 0) {
            const message = "Welcome to Y2K Staking! Sign to verify your wallet.";
            try {
                const signature = await window.ethereum.request({
                    method: 'personal_sign',
                    params: [message, accounts[0]],
                });
                console.log("Signature verified:", signature);
                
                userAccount = accounts[0];
                updateWalletButton();
                await updateUI();
            } catch (signError) {
                console.error("Signature rejected:", signError);
                alert("Please sign the message to connect your wallet");
            }
        }
    } catch (error) {
        console.error("Connection error:", error);
        alert(error.message);
    }
}

// 🔄 **Update UI with Data**
async function updateUI() {
    if (!userAccount) return;

    try {
        showLoading("Updating dashboard...");

        const [
            y2kBalance,
            stakeInfo,
            totalStaked,
            earnedRewards,
            autoCompoundStatus
        ] = await Promise.all([
            y2kContract.methods.balanceOf(userAccount).call(),
            stakingContract.methods.stakes(userAccount).call(),
            stakingContract.methods.totalStaked().call(),
            stakingContract.methods.earned(userAccount).call(),
            stakingContract.methods.autoCompoundingEnabled().call()
        ]);

        document.getElementById('y2kBalance').textContent = web3.utils.fromWei(y2kBalance);
        document.getElementById('stakedAmount').textContent = web3.utils.fromWei(stakeInfo.amount);
        document.getElementById('totalStaked').textContent = web3.utils.fromWei(totalStaked);
        document.getElementById('earnedRewards').textContent = web3.utils.fromWei(earnedRewards);
        
        document.getElementById('autoCompoundToggle').checked = autoCompoundStatus;
        document.getElementById('autoCompoundStatus').textContent = autoCompoundStatus ? 'ON' : 'OFF';

        hideLoading();
    } catch (error) {
        console.error("Error updating UI:", error);
        hideLoading();
        alert("Failed to update dashboard.");
    }
}

// 🔄 **Loading Functions**
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

// 🏆 **Referral Link Copy**
function copyReferralLink() {
    const referralLink = document.getElementById('referralLink');
    referralLink.select();
    document.execCommand('copy');
    alert('Referral link copied to clipboard!');
}

// 🔄 **Initialize DApp on Load**
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM loaded, initializing...");
    try {
        await initializeWeb3();
        
        // Add event listeners
        document.getElementById('connectWallet').addEventListener('click', connectWallet);
        document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);
        
        console.log("DApp initialized successfully!");
    } catch (error) {
        console.error("Failed to initialize DApp:", error);
    }
});
