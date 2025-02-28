console.log("Script starting...");

// Check if Web3 is available
if (typeof Web3 === 'undefined') {
    console.error("Web3 is not loaded!");
}

// Check if contract config is available
if (typeof window.contractConfig === 'undefined') {
    console.error("Contract config is not loaded!");
}

let web3;
let stakingContract;
let pogsContract;
let y2kContract;
let userAccount;

try {
    const { stakingContractAddress, stakingABI, pogsContractAddress, pogsABI, y2kContractAddress, y2kABI } = window.contractConfig;
} catch (error) {
    console.error("Error accessing contract config:", error);
}

async function initializeWeb3() {
    console.log("Initializing Web3...");
    if (typeof window.ethereum !== 'undefined') {
        try {
            console.log("MetaMask is installed");
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
    } else {
        console.log("MetaMask is not installed");
        alert("Please install MetaMask to use this dApp");
    }
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
    console.log("Wallet disconnected");
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
    console.log("Connect wallet clicked");
    try {
        if (!window.ethereum) {
            console.error("MetaMask not found");
            alert("Please install MetaMask!");
            return;
        }

        console.log("Requesting accounts...");
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        console.log("Accounts:", accounts);

        if (accounts.length > 0) {
            userAccount = accounts[0];
            console.log("Connected to:", userAccount);
            updateWalletButton();
            await updateUI();
        } else {
            console.error("No accounts found");
        }

    } catch (error) {
        console.error("Connection error:", error);
        if (error.code === 4001) {
            alert("Please connect your wallet to continue.");
        } else {
            alert("Error connecting wallet: " + error.message);
        }
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

async function stakeY2K() {
    if (!userAccount) {
        alert("Please connect your wallet first");
        return;
    }

    const amount = document.getElementById('stakeAmount').value;
    if (!amount || isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount to stake");
        return;
    }

    try {
        const amountWei = web3.utils.toWei(amount, 'ether');
        
        // First approve Y2K transfer
        await y2kContract.methods.approve(stakingContractAddress, amountWei)
            .send({ from: userAccount });
        
        // Then stake
        await stakingContract.methods.stake(amountWei)
            .send({ from: userAccount });
        
        document.getElementById('stakeAmount').value = '';
        await updateUI();
        alert("Staking successful!");
    } catch (error) {
        console.error("Staking failed:", error);
        alert("Staking failed. Please try again.");
    }
}

async function unstakeY2K() {
    if (!userAccount) {
        alert("Please connect your wallet first");
        return;
    }

    const amount = document.getElementById('unstakeAmount').value;
    if (!amount || isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount to unstake");
        return;
    }

    try {
        const amountWei = web3.utils.toWei(amount, 'ether');
        await stakingContract.methods.unstake(amountWei)
            .send({ from: userAccount });
        
        document.getElementById('unstakeAmount').value = '';
        await updateUI();
        alert("Unstaking successful!");
    } catch (error) {
        console.error("Unstaking failed:", error);
        alert("Unstaking failed. Please try again.");
    }
}

async function claimRewards() {
    if (!userAccount) {
        alert("Please connect your wallet first");
        return;
    }

    try {
        await stakingContract.methods.claimReward()
            .send({ from: userAccount });
        await updateUI();
        alert("Rewards claimed successfully!");
    } catch (error) {
        console.error("Claiming rewards failed:", error);
        alert("Failed to claim rewards. Please try again.");
    }
}

async function toggleAutoCompounding() {
    if (!userAccount) {
        alert("Please connect your wallet first");
        return;
    }

    const status = document.getElementById('autoCompoundToggle').checked;

    try {
        await stakingContract.methods.toggleAutoCompounding(status)
            .send({ from: userAccount });
        document.getElementById('autoCompoundStatus').textContent = status ? 'ON' : 'OFF';
        await updateUI();
    } catch (error) {
        console.error("Toggle auto-compounding failed:", error);
        document.getElementById('autoCompoundToggle').checked = !status;
        alert("Failed to toggle auto-compounding. Please try again.");
    }
}

function calculateAPY(rewardRate) {
    return (rewardRate / 1e18) * 365 * 100;
}

function copyReferralLink() {
    const referralLink = document.getElementById('referralLink');
    referralLink.select();
    document.execCommand('copy');
    alert('Referral link copied to clipboard!');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM loaded, initializing...");
    await initializeWeb3();
    
    // Add event listeners
    const connectButton = document.getElementById('connectWallet');
    if (connectButton) {
        console.log("Adding connect button listener");
        connectButton.addEventListener('click', connectWallet);
    } else {
        console.error("Connect button not found!");
    }

    const disconnectButton = document.getElementById('disconnectWallet');
    if (disconnectButton) {
        console.log("Adding disconnect button listener");
        disconnectButton.addEventListener('click', disconnectWallet);
    }

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
