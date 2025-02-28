console.log("Y2K Staking DApp Loaded...");

let web3;
let stakingContract;
let pogsContract;
let y2kContract;
let userAccount;

// 🚀 **Initialize Web3 & Contracts**
async function initializeWeb3() {
    console.log("Initializing Web3...");
    if (typeof window.ethereum !== 'undefined') {
        try {
            web3 = new Web3(window.ethereum);
            
            // Initialize contracts
            const contracts = await initializeContracts(web3);
            stakingContract = contracts.staking;
            pogsContract = contracts.pogs;
            y2kContract = contracts.y2k;

            // Verify network
            await networkUtils.verifyNetwork(window.ethereum);

            // Setup event listeners
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);
            window.ethereum.on('disconnect', handleDisconnect);

            // Check if already connected
            const accounts = await web3.eth.getAccounts();
            if (accounts.length > 0) {
                userAccount = accounts[0];
                updateWalletButton();
                await updateUI();
            }
        } catch (error) {
            console.error("Initialization error:", error);
            alert("Failed to initialize. Please check your wallet connection.");
        }
    } else {
        alert("Please install MetaMask to use this dApp.");
    }
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
        updateUI();
    }
}

function handleDisconnect() {
    disconnectWallet();
}

function disconnectWallet() {
    userAccount = null;
    updateWalletButton();
    resetUI();
}

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

// 🔗 **Wallet Connection with Signature Verification**
async function connectWallet() {
    try {
        if (!window.ethereum) throw new Error("Please install MetaMask!");

        await networkUtils.verifyNetwork(window.ethereum);

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

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
        alert(txUtils.getErrorMessage(error));
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

        document.getElementById('y2kBalance').textContent = txUtils.formatAmount(y2kBalance);
        document.getElementById('stakedAmount').textContent = txUtils.formatAmount(stakeInfo.amount);
        document.getElementById('totalStaked').textContent = txUtils.formatAmount(totalStaked);
        document.getElementById('earnedRewards').textContent = txUtils.formatAmount(earnedRewards);
        
        document.getElementById('autoCompoundToggle').checked = autoCompoundStatus;
        document.getElementById('autoCompoundStatus').textContent = autoCompoundStatus ? 'ON' : 'OFF';

        const referralLink = `${window.location.origin}?ref=${userAccount}`;
        document.getElementById('referralLink').value = referralLink;

        hideLoading();
    } catch (error) {
        console.error("Error updating UI:", error);
        hideLoading();
        alert("Failed to update dashboard.");
    }
}

// 🔄 **Auto-Compounding Toggle**
async function toggleAutoCompounding() {
    if (!userAccount) {
        alert("Please connect your wallet first");
        return;
    }

    const status = document.getElementById('autoCompoundToggle').checked;
    try {
        showLoading(`Auto-compounding ${status ? 'enabling' : 'disabling'}...`);

        await txUtils.sendTransaction(
            web3,
            stakingContract.methods.toggleAutoCompounding(status),
            userAccount
        );

        document.getElementById('autoCompoundStatus').textContent = status ? 'ON' : 'OFF';
        await updateUI();
        alert(`Auto-compounding ${status ? 'enabled' : 'disabled'} successfully!`);
    } catch (error) {
        console.error("Auto-compounding toggle failed:", error);
        document.getElementById('autoCompoundToggle').checked = !status;
        alert(txUtils.getErrorMessage(error));
    } finally {
        hideLoading();
    }
}

// 🎟 **Copy Referral Link**
function copyReferralLink() {
    const referralLink = document.getElementById('referralLink');
    referralLink.select();
    document.execCommand('copy');
    alert('Referral link copied to clipboard!');
}

// **Loading Overlay for Transactions**
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

// **Initialize App on Load**
document.addEventListener('DOMContentLoaded', async () => {
    await initializeWeb3();
    
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);
    document.getElementById('autoCompoundToggle').addEventListener('change', toggleAutoCompounding);
});
