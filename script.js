let web3;
let stakingContract;
let pogsContract;
let userAccount;
const { stakingContractAddress, stakingABI, pogsContractAddress, pogsABI } = window.contractConfig;

async function initializeWeb3() {
    if (typeof window.ethereum !== 'undefined') {
        web3 = new Web3(window.ethereum);
        stakingContract = new web3.eth.Contract(stakingABI, stakingContractAddress);
        pogsContract = new web3.eth.Contract(pogsABI, pogsContractAddress);
        
        window.ethereum.on('accountsChanged', function (accounts) {
            userAccount = accounts[0];
            updateUI();
        });

        window.ethereum.on('chainChanged', function () {
            window.location.reload();
        });
    }
}

async function connectWallet() {
    try {
        if (!window.ethereum) {
            throw new Error("Please install MetaMask or a compatible wallet.");
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAccount = accounts[0];
        
        document.getElementById('connectWallet').textContent = 
            userAccount.substring(0, 6) + '...' + userAccount.substring(38);
        
        await updateUI();
        return true;
    } catch (error) {
        console.error("Connection error:", error);
        alert(error.message);
        return false;
    }
}

async function updateUI() {
    if (!userAccount) return;

    try {
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

        const autoCompoundStatus = document.getElementById('autoCompoundStatus');
        autoCompoundStatus.textContent = 
            document.getElementById('autoCompoundToggle').checked ? 'ON' : 'OFF';

        const referralLink = `${window.location.origin}?ref=${userAccount}`;
        document.getElementById('referralLink').value = referralLink;

    } catch (error) {
        console.error("Error updating UI:", error);
        alert("Error updating information. Please try again.");
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
        
        await pogsContract.methods.approve(stakingContractAddress, amountWei)
            .send({ from: userAccount });
        
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

document.addEventListener('DOMContentLoaded', async () => {
    await initializeWeb3();
    
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('stakeButton').addEventListener('click', stakeY2K);
    document.getElementById('unstakeButton').addEventListener('click', unstakeY2K);
    document.getElementById('claimRewards').addEventListener('click', claimRewards);
    document.getElementById('autoCompoundToggle').addEventListener('change', toggleAutoCompounding);

    const urlParams = new URLSearchParams(window.location.search);
    const referrer = urlParams.get('ref');
    if (referrer) {
        localStorage.setItem('referrer', referrer);
    }
});
