// 🔹 Check for Web3 Availability
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
        console.log("✅ MetaMask or a compatible provider detected.");
        web3 = new Web3(window.ethereum);
    } else if (window.web3) {
        console.log("✅ Legacy Web3 provider detected.");
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

        // Verify network
        await verifyNetwork();

        // Check existing connection
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
            userAccount = accounts[0];
            updateWalletButton();
            await requestSignature(userAccount);
            await updateUI();
        } else {
            console.warn("⚠️ No accounts connected.");
        }
    } catch (error) {
        console.error("❌ Initialization error:", error);
        alert(error.message || "Failed to initialize Web3.");
    }
}

// 🌐 **Verify Correct Network**
async function verifyNetwork() {
    const chainId = await web3.eth.getChainId();
    if (chainId !== 25) { // Cronos Mainnet chain ID
        alert("⚠️ Please switch to the Cronos Mainnet!");
        console.log("❌ Wrong network detected. Expected: Cronos Mainnet (25), Got:", chainId);
    } else {
        console.log("✅ Correct network: Cronos Mainnet.");
    }
}

// 🌐 **Handle Chain & Account Changes**
function setupWalletListeners() {
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);
}

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
        requestSignature(userAccount);
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

// 🔑 **Sign Before Connecting**
async function requestSignature(account) {
    try {
        const message = `Welcome to Y2K Staking!\n\nVerify your wallet: ${account}`;
        const signature = await web3.eth.personal.sign(message, account, "");
        console.log("✅ Signature verified:", signature);
    } catch (error) {
        console.error("❌ Signature rejected:", error);
        alert("You must sign the message to connect.");
        disconnectWallet();
    }
}

// 🔗 **Connect Wallet**
async function connectWallet() {
    try {
        if (!window.ethereum) {
            throw new Error("Please install MetaMask!");
        }

        await verifyNetwork();

        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts',
        });

        if (accounts.length > 0) {
            userAccount = accounts[0];
            updateWalletButton();
            await requestSignature(userAccount);
            await updateUI();
        }
    } catch (error) {
        console.error("❌ Connection error:", error);
        alert(error.message || "Failed to connect wallet.");
    }
}

// 📊 **Update Staking Dashboard**
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

        document.getElementById('y2kBalance').textContent = y2kBalance;
        document.getElementById('stakedAmount').textContent = stakeInfo.amount;
        document.getElementById('totalStaked').textContent = totalStaked;
        document.getElementById('earnedRewards').textContent = earnedRewards;
        
        document.getElementById('autoCompoundToggle').checked = autoCompoundStatus;
        document.getElementById('autoCompoundStatus').textContent = autoCompoundStatus ? 'ON' : 'OFF';

        const referralLink = `${window.location.origin}?ref=${userAccount}`;
        document.getElementById('referralLink').value = referralLink;

        hideLoading();
    } catch (error) {
        console.error("❌ Error updating UI:", error);
        hideLoading();
        alert("Failed to update dashboard.");
    }
}

// 🎯 **Initialize**
document.addEventListener('DOMContentLoaded', async () => {
    await initializeWeb3();
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);
});
