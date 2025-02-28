console.log("Script starting...");

let web3;
let stakingContract;
let pogsContract;
let y2kContract;
let userAccount;

async function initializeWeb3() {
    console.log("Initializing Web3...");
    if (typeof window.ethereum !== 'undefined') {
        try {
            console.log("MetaMask is installed");
            web3 = new Web3(window.ethereum);
            
            // Initialize contracts
            const { stakingContractAddress, stakingABI, pogsContractAddress, pogsABI, y2kContractAddress, y2kABI } = window.contractConfig;
            stakingContract = new web3.eth.Contract(stakingABI, stakingContractAddress);
            pogsContract = new web3.eth.Contract(pogsABI, pogsContractAddress);
            y2kContract = new web3.eth.Contract(y2kABI, y2kContractAddress);

            // Check network
            const chainId = await web3.eth.getChainId();
            const expectedChainId = parseInt(window.contractConfig.network.chainId);
            if (chainId !== expectedChainId) {
                console.log("Wrong network detected. Requesting network switch...");
                await switchNetwork();
            }

            // Listen for events
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);
            window.ethereum.on('disconnect', handleDisconnect);

        } catch (error) {
            console.error("Failed to initialize Web3:", error);
        }
    } else {
        console.log("MetaMask is not installed");
        alert("Please install MetaMask to use this dApp");
    }
}

async function switchNetwork() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: window.contractConfig.network.chainId }],
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [window.contractConfig.network],
                });
            } catch (addError) {
                console.error("Failed to add network:", addError);
            }
        }
        console.error("Failed to switch network:", switchError);
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
    console.log("Wallet disconnected");
    disconnectWallet();
}

function disconnectWallet() {
    userAccount = null;
    updateWalletButton();
    localStorage.removeItem('walletConnected');
    resetUI();
}

function resetUI() {
    document.getElementById('stakedAmount').textContent = '0';
    document.getElementById('burnedRewards').textContent = '0';
    document.getElementById('apyPercentage').textContent = '0';
    document.getElementById('totalStaked').textContent = '0';
    document.getElementById('earnedRewards').textContent = '0';
    document.getElementById('referralLink').value = '';
    document.getElementById('y2kBalance').textContent = '0';
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

async function connectWallet() {
    console.log("Connect wallet clicked");
    try {
        if (!window.ethereum) {
            throw new Error("Please install MetaMask!");
        }

        // Request accounts
        console.log("Requesting accounts...");
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        if (accounts.length > 0) {
            // Request signature
            const message = "Welcome to Y2K Staking DApp! Please sign this message to verify your wallet ownership.";
            try {
                console.log("Requesting signature...");
                const signature = await window.ethereum.request({
                    method: 'personal_sign',
                    params: [message, accounts[0]],
                });
                console.log("Signature received:", signature);
                
                userAccount = accounts[0];
                console.log("Connected to:", userAccount);
                updateWalletButton();
                await updateUI();
            } catch (signError) {
                console.error("Signature rejected:", signError);
                alert("Please sign the message to connect your wallet");
                return;
            }
        }

    } catch (error) {
        console.error("Connection error:", error);
        alert(error.message);
    }
}

async function updateUI() {
    if (!userAccount) return;

    try {
        const [
            y2kBalance,
            stakeInfo,
            rewardRate,
            totalStaked,
            earnedRewards
        ] = await Promise.all([
            y2kContract.methods.balanceOf(userAccount).call(),
            stakingContract.methods.stakes(userAccount).call(),
            stakingContract.methods.rewardRate().call(),
            stakingContract.methods.totalStaked().call(),
            stakingContract.methods.earned(userAccount).call()
        ]);

        document.getElementById('y2kBalance').textContent = web3.utils.fromWei(y2kBalance, 'ether');
        document.getElementById('stakedAmount').textContent = web3.utils.fromWei(stakeInfo.amount, 'ether');
        document.getElementById('apyPercentage').textContent = calculateAPY(rewardRate).toFixed(2);
        document.getElementById('totalStaked').textContent = web3.utils.fromWei(totalStaked, 'ether');
        document.getElementById('earnedRewards').textContent = web3.utils.fromWei(earnedRewards, 'ether');
        
        const referralLink = `${window.location.origin}?ref=${userAccount}`;
        document.getElementById('referralLink').value = referralLink;

    } catch (error) {
        console.error("Error updating UI:", error);
    }
}

async function stakeY2K() {
    console.log("Staking initiated...");
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
        console.log("Amount to stake (wei):", amountWei);

        // Check balance
        const balance = await y2kContract.methods.balanceOf(userAccount).call();
        if (BigInt(balance) < BigInt(amountWei)) {
            alert("Insufficient Y2K balance");
            return;
        }

        // Check allowance
        const allowance = await y2kContract.methods.allowance(userAccount, stakingContractAddress).call();
        if (BigInt(allowance) < BigInt(amountWei)) {
            const gasPrice = await window.contractConfig.utils.getNetworkGasPrice();
            const approveMethod = y2kContract.methods.approve(stakingContractAddress, amountWei);
            const gasLimit = await window.contractConfig.utils.estimateGas(approveMethod, userAccount);

            console.log("Requesting approval...");
            await approveMethod.send({ 
                from: userAccount,
                gasPrice: gasPrice,
                gas: gasLimit
            });
        }

        // Stake tokens
        console.log("Staking tokens...");
        const gasPrice = await window.contractConfig.utils.getNetworkGasPrice();
        const stakeMethod = stakingContract.methods.stake(amountWei);
        const gasLimit = await window.contractConfig.utils.estimateGas(stakeMethod, userAccount);

        await stakeMethod.send({ 
            from: userAccount,
            gasPrice: gasPrice,
            gas: gasLimit
        });
        
        document.getElementById('stakeAmount').value = '';
        await updateUI();
        alert("Staking successful!");
    } catch (error) {
        console.error("Staking failed:", error);
        handleTransactionError(error);
    }
}

function handleTransactionError(error) {
    if (error.code === 4001) {
        alert("Transaction rejected by user");
    } else if (error.message.includes("gas")) {
        alert("Transaction failed: Gas estimation failed. Your stake amount might be too high or contract paused.");
    } else {
        alert("Transaction failed: " + error.message);
    }
}

// ... rest of your existing functions (unstakeY2K, claimRewards, etc.) ...

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
