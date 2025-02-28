let web3;
let stakingContract;
let pogsContract;
let y2kContract;
let userAccount;
const { stakingContractAddress, stakingABI, pogsContractAddress, pogsABI, y2kContractAddress, y2kABI } = window.contractConfig;

async function initializeWeb3() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            web3 = new Web3(window.ethereum);
            stakingContract = new web3.eth.Contract(stakingABI, stakingContractAddress);
            pogsContract = new web3.eth.Contract(pogsABI, pogsContractAddress);
            y2kContract = new web3.eth.Contract(y2kABI, y2kContractAddress);

            // Listen for account changes
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });
            window.ethereum.on('disconnect', handleDisconnect);

        } catch (error) {
            console.error("Failed to initialize Web3:", error);
        }
    }
}

function handleAccountsChanged(accounts) {
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
    localStorage.removeItem('walletConnected');
    // Reset UI elements
    document.getElementById('stakedAmount').textContent = '0';
    document.getElementById('burnedRewards').textContent = '0';
    document.getElementById('apyPercentage').textContent = '0';
    document.getElementById('totalStaked').textContent = '0';
    document.getElementById('earnedRewards').textContent = '0';
    document.getElementById('referralLink').value = '';
    document.getElementById('y2kBalance').textContent = '0';
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

async function connectWallet() {
    try {
        if (!window.ethereum) {
            throw new Error("Please install MetaMask or a compatible wallet.");
        }

        // Request accounts access
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });

        if (accounts.length > 0) {
            userAccount = accounts[0];
            updateWalletButton();
            await updateUI();
            console.log("Wallet connected:", userAccount);
        }

    } catch (error) {
        console.error("Connection error:", error);
        alert(error.message);
    }
}

async function updateUI() {
    if (!userAccount) return;

    try {
        // Get Y2K balance
        const y2kBalance = await y2kContract.methods.balanceOf(userAccount).call();
        document.getElementById('y2kBalance').textContent = web3.utils.fromWei(y2kBalance, 'ether');

        const stakeInfo = await stakingContract.methods.stakes(userAccount).call();
        const stakedAmount = web3.utils.fromWei(stakeInfo.amount, 'ether');
        document.getElementById('stakedAmount').textContent = stakedAmount;
        
        const rewardRate = await stakingContract.methods.rewardRate().call();
        const apy = calculateAPY(rewardRate);
        document.getElementById('apyPercentage').textContent = apy.toFixed(2);

        const totalStaked = await stakingContract.methods.totalStaked().call();
        document.getElementById('totalStaked').textContent = 
            web3.utils.fromWei(totalStaked, 'ether');

        const earnedRewards = await stakingContract.methods.earned(userAccount).call();
        document.getElementById('earnedRewards').textContent = 
            web3.utils.fromWei(earnedRewards, 'ether');

        const referralLink = `${window.location.origin}?ref=${userAccount}`;
        document.getElementById('referralLink').value = referralLink;

    } catch (error) {
        console.error("Error updating UI:", error);
    }
}

// ... rest of your functions remain the same ...

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    await initializeWeb3();
    
    // Add event listeners
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);
    document.getElementById('stakeButton').addEventListener('click', stakeY2K);
    document.getElementById('unstakeButton').addEventListener('click', unstakeY2K);
    document.getElementById('claimRewards').addEventListener('click', claimRewards);
    document.getElementById('autoCompoundToggle').addEventListener('change', toggleAutoCompounding);

    // Check for referral
    const urlParams = new URLSearchParams(window.location.search);
    const referrer = urlParams.get('ref');
    if (referrer) {
        localStorage.setItem('referrer', referrer);
    }
});
