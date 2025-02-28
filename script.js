console.log("Y2K Staking DApp Loaded...");

let web3;
let stakingContract;
let y2kContract;
let userAccount;

// Ensure contractConfig is loaded before running the app
async function waitForContractConfig() {
    for (let i = 0; i < 50; i++) {  
        if (window.contractConfig) return window.contractConfig;
        await new Promise(r => setTimeout(r, 100));
    }
    throw new Error("Contract configuration not loaded in time.");
}

async function initializeWeb3() {
    try {
        if (!window.ethereum) throw new Error("MetaMask is required!");

        web3 = new Web3(window.ethereum);
        const config = await waitForContractConfig();

        const contracts = await config.initializeContracts(web3);
        stakingContract = contracts.staking;
        y2kContract = contracts.y2k;

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());

        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
            userAccount = accounts[0];
            updateWalletButton();
            await updateUI();
        }
    } catch (error) {
        console.error("Initialization failed:", error);
    }
}

async function connectWallet() {
    try {
        if (!window.ethereum) throw new Error("MetaMask is required!");

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (!accounts.length) throw new Error("No wallet accounts detected.");

        userAccount = accounts[0];
        updateWalletButton();
        await updateUI();
    } catch (error) {
        console.error("Wallet connection error:", error);
    }
}

async function updateUI() {
    if (!userAccount || !stakingContract || !y2kContract) return;

    try {
        const [y2kBalance, stakeInfo, earnedRewards] = await Promise.all([
            y2kContract.methods.balanceOf(userAccount).call(),
            stakingContract.methods.stakes(userAccount).call(),
            stakingContract.methods.earned(userAccount).call()
        ]);

        document.getElementById('y2kBalance').textContent = web3.utils.fromWei(y2kBalance);
        document.getElementById('stakedAmount').textContent = web3.utils.fromWei(stakeInfo.amount);
        document.getElementById('earnedRewards').textContent = web3.utils.fromWei(earnedRewards);
    } catch (error) {
        console.error("Failed to update dashboard:", error);
    }
}

async function stakeY2K() {
    const amount = document.getElementById('stakeAmount').value;
    if (!amount || isNaN(amount) || amount <= 0) return;

    try {
        const amountWei = web3.utils.toWei(amount, 'ether');

        await window.contractConfig.utils.sendTransaction(
            web3,
            stakingContract.methods.stake(amountWei, "0x0000000000000000000000000000000000000000"),
            userAccount
        );

        await updateUI();
        alert("Staking successful!");
    } catch (error) {
        console.error("Staking failed:", error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await initializeWeb3();
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('stakeButton').addEventListener('click', stakeY2K);
});
