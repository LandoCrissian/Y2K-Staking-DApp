console.log("Y2K Staking DApp Loading...");

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

        // Timeout after 5 seconds
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

        // Check existing connection
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
            userAccount = accounts[0];
            updateWalletButton();
            await updateUI();
        } else {
            console.warn("⚠️ No accounts connected.");
        }
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
async function testWeb3Connection() {
    console.log("Checking Web3 connection...");

    if (typeof window.ethereum === 'undefined') {
        console.error("❌ MetaMask not found.");
        alert("MetaMask not detected. Please install MetaMask.");
        return;
    }

    try {
        const web3Test = new Web3(window.ethereum);
        const accounts = await web3Test.eth.getAccounts();
        
        if (accounts.length > 0) {
            console.log("✅ Web3 connected! Account:", accounts[0]);
        } else {
            console.warn("⚠️ No accounts connected. Please connect your wallet.");
        }
    } catch (error) {
        console.error("❌ Web3 connection failed:", error);
    }
}

// Call test function
testWeb3Connection();
