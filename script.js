import { stakingContractAddress, stakingABI, pogsContractAddress, pogsABI } from './contract.js';

let web3;
let stakingContract;
let pogsContract;
let userAccount;

// Connect Wallet Function
async function connectWallet() {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3.eth.getAccounts();
        userAccount = accounts[0];

        stakingContract = new web3.eth.Contract(stakingABI, stakingContractAddress);
        pogsContract = new web3.eth.Contract(pogsABI, pogsContractAddress);

        updateUI();
    } else {
        alert("Please install MetaMask or a compatible wallet to use this feature.");
    }
}

// Update UI Function (Fetches & Displays User Data)
async function updateUI() {
    if (!userAccount) return;

    try {
        // Fetch user’s staked amount
        const stakeInfo = await stakingContract.methods.stakes(userAccount).call();
        document.getElementById('stakedAmount').innerText = 
            `Staked: ${web3.utils.fromWei(stakeInfo.amount, 'ether')} Y2K`;

        // Fetch POGS Balance
        const pogsBalance = await pogsContract.methods.balanceOf(userAccount).call();
        document.getElementById('pogsBalance').innerText = 
            `POGS Balance: ${web3.utils.fromWei(pogsBalance, 'ether')} POGS`;

        // Fetch Auto-Compounding Status
        const autoCompoundingStatus = await stakingContract.methods.autoCompoundingEnabled().call();
        document.getElementById('autoCompoundingToggle').checked = autoCompoundingStatus;
    } catch (error) {
        console.error("Error updating UI:", error);
    }
}

// Stake Y2K Function
async function stakeY2K() {
    if (!userAccount) return;

    const amount = document.getElementById('stakeAmount').value;
    if (!amount || isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount to stake.");
        return;
    }

    try {
        await stakingContract.methods.stake(web3.utils.toWei(amount, 'ether')).send({ from: userAccount });
        updateUI();
    } catch (error) {
        console.error("Staking failed:", error);
    }
}

// Unstake Y2K Function
async function unstakeY2K() {
    if (!userAccount) return;

    const amount = document.getElementById('unstakeAmount').value;
    if (!amount || isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount to unstake.");
        return;
    }

    try {
        await stakingContract.methods.unstake(web3.utils.toWei(amount, 'ether')).send({ from: userAccount });
        updateUI();
    } catch (error) {
        console.error("Unstaking failed:", error);
    }
}

// Claim Rewards Function
async function claimRewards() {
    if (!userAccount) return;

    try {
        await stakingContract.methods.claimReward().send({ from: userAccount });
        updateUI();
    } catch (error) {
        console.error("Claiming rewards failed:", error);
    }
}

// Toggle Auto-Compounding Function
async function toggleAutoCompounding() {
    if (!userAccount) return;

    const status = document.getElementById('autoCompoundingToggle').checked;

    try {
        await stakingContract.methods.toggleAutoCompounding(status).send({ from: userAccount });
        updateUI();
    } catch (error) {
        console.error("Toggling auto-compounding failed:", error);
    }
}

// Event Listeners for Buttons
document.getElementById('connectWalletButton').addEventListener('click', connectWallet);
document.getElementById('stakeButton').addEventListener('click', stakeY2K);
document.getElementById('unstakeButton').addEventListener('click', unstakeY2K);
document.getElementById('claimRewardsButton').addEventListener('click', claimRewards);
document.getElementById('autoCompoundingToggle').addEventListener('change', toggleAutoCompounding);
