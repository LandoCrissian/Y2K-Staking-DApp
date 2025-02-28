console.log("Script starting...");

let userAccount;

// Initialize Web3 & Contracts
async function initializeWeb3() {
    console.log("Initializing Web3...");
    if (typeof window.ethereum !== 'undefined') {
        web3 = new Web3(window.ethereum);

        const { stakingContractAddress, stakingABI, pogsContractAddress, pogsABI } = window.contractConfig;
        stakingContract = new web3.eth.Contract(stakingABI, stakingContractAddress);
        pogsContract = new web3.eth.Contract(pogsABI, pogsContractAddress);

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());
    } else {
        alert("Please install MetaMask to use this dApp.");
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        disconnectWallet();
    } else {
        userAccount = accounts[0];
        updateUI();
    }
}

// Wallet Connection
async function connectWallet() {
    console.log("Connecting wallet...");
    try {
        if (!window.ethereum) throw new Error("Please install MetaMask!");

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
            userAccount = accounts[0];

            const message = "Sign to verify your wallet for Y2K Staking.";
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, userAccount],
            });

            console.log("Signature received:", signature);
            document.getElementById('connectWallet').textContent = `${userAccount.substring(0, 6)}...${userAccount.slice(-4)}`;
            await updateUI();
        }
    } catch (error) {
        console.error("Connection error:", error);
    }
}

// Update UI
async function updateUI() {
    if (!userAccount) return;

    try {
        const [y2kBalance, stakeInfo, totalStaked, earnedRewards] = await Promise.all([
            stakingContract.methods.stakes(userAccount).call(),
            stakingContract.methods.totalStaked().call(),
            stakingContract.methods.earned(userAccount).call()
        ]);

        document.getElementById('stakedAmount').textContent = web3.utils.fromWei(stakeInfo.amount, 'ether');
        document.getElementById('totalStaked').textContent = web3.utils.fromWei(totalStaked, 'ether');
        document.getElementById('earnedRewards').textContent = web3.utils.fromWei(earnedRewards, 'ether');
    } catch (error) {
        console.error("Error updating UI:", error);
    }
}

// Stake Y2K
async function stakeY2K() {
    if (!userAccount) {
        alert("Please connect your wallet first.");
        return;
    }

    const amount = document.getElementById('stakeAmount').value;
    if (!amount || isNaN(amount) || amount <= 0) {
        alert("Enter a valid amount.");
        return;
    }

    try {
        const amountWei = web3.utils.toWei(amount, 'ether');
        await stakingContract.methods.stake(amountWei).send({ from: userAccount });
        alert("Staking successful!");
        updateUI();
    } catch (error) {
        console.error("Staking failed:", error);
    }
}

// Toggle Auto-Compounding
async function toggleAutoCompounding() {
    if (!userAccount) {
        alert("Please connect your wallet first.");
        return;
    }

    const status = document.getElementById('autoCompoundToggle').checked;
    try {
        await stakingContract.methods.toggleAutoCompounding(status).send({ from: userAccount });
        document.getElementById('autoCompoundStatus').textContent = status ? 'ON' : 'OFF';
    } catch (error) {
        console.error("Error toggling auto-compounding:", error);
    }
}

// Copy Referral Link
function copyReferralLink() {
    const referralLink = `${window.location.origin}?ref=${userAccount}`;
    navigator.clipboard.writeText(referralLink);
    alert("Referral link copied!");
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('stakeButton').addEventListener('click', stakeY2K);
    document.getElementById('autoCompoundToggle').addEventListener('change', toggleAutoCompounding);
});

// Initialize Web3
initializeWeb3();
