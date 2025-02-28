console.log("Y2K Staking DApp Loading...");

let web3;
let stakingContract;
let pogsContract;
let y2kContract;
let userAccount;

// Wait for contract config to be available
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

async function verifyNetwork() {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    console.log("Current Chain ID:", chainId, "Expected:", window.contractConfig.network.chainId);
    
    if (chainId !== window.contractConfig.network.chainId) {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: window.contractConfig.network.chainId }],
            });
            return true;
        } catch (switchError) {
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [window.contractConfig.network],
                    });
                    return true;
                } catch (addError) {
                    console.error("Failed to add network:", addError);
                    return false;
                }
            }
            console.error("Failed to switch network:", switchError);
            return false;
        }
    }
    return true;
}

async function initializeWeb3() {
    console.log("Initializing Web3...");
    
    try {
        const config = await waitForContractConfig();
        if (!config) {
            throw new Error("Contract configuration not loaded");
        }
        console.log("Contract config loaded:", config);

        if (typeof window.ethereum === 'undefined') {
            throw new Error("Please install MetaMask to use this dApp.");
        }

        web3 = new Web3(window.ethereum);
        console.log("Web3 initialized:", web3.version);

        const networkVerified = await verifyNetwork();
        if (!networkVerified) {
            throw new Error("Please switch to Cronos network");
        }
        
        const contracts = await config.initializeContracts(web3);
        if (!contracts) {
            throw new Error("Failed to initialize contracts");
        }
        console.log("Contracts initialized:", contracts);

        stakingContract = contracts.staking;
        pogsContract = contracts.pogs;
        y2kContract = contracts.y2k;

        console.log("Contract Addresses:", {
            staking: stakingContract._address,
            pogs: pogsContract._address,
            y2k: y2kContract._address
        });

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        window.ethereum.on('disconnect', handleDisconnect);

        console.log("Initialization complete!");

    } catch (error) {
        console.error("Initialization error:", error);
        alert(error.message || "Failed to initialize. Please check your wallet connection.");
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

async function connectWallet() {
    try {
        if (!window.ethereum) {
            throw new Error("Please install MetaMask!");
        }

        console.log("Checking network...");
        const config = await waitForContractConfig();
        if (!config) {
            throw new Error("DApp not properly initialized");
        }

        const networkVerified = await verifyNetwork();
        if (!networkVerified) {
            throw new Error("Please switch to Cronos network");
        }

        console.log("Requesting accounts...");
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        console.log("Accounts received:", accounts);

        if (accounts.length > 0) {
            const message = "Welcome to Y2K Staking! Sign to verify your wallet.";
            try {
                const signature = await window.ethereum.request({
                    method: 'personal_sign',
                    params: [message, accounts[0]],
                });
                console.log("Signature verified:", signature);
                
                userAccount = accounts[0];
                console.log("User account set:", userAccount);
                
                updateWalletButton();
                console.log("Wallet button updated");
                
                console.log("Starting UI update...");
                await updateUI();
                console.log("UI update completed");
            } catch (signError) {
                console.error("Signature rejected:", signError);
                alert("Please sign the message to connect your wallet");
            }
        }
    } catch (error) {
        console.error("Connection error:", error);
        alert(window.contractConfig?.utils.getErrorMessage(error) || error.message);
    }
}

async function updateUI() {
    if (!userAccount) {
        console.log("No user account, skipping UI update");
        return;
    }

    try {
        console.log("Starting UI update for account:", userAccount);
        showLoading("Updating dashboard...");

        // Verify network first
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        console.log("Current chain ID:", chainId);
        if (chainId !== window.contractConfig.network.chainId) {
            throw new Error("Please switch to Cronos network");
        }

        // Verify contracts are initialized
        if (!stakingContract || !y2kContract || !pogsContract) {
            console.log("Reinitializing contracts...");
            const contracts = await window.contractConfig.initializeContracts(web3);
            if (!contracts) {
                throw new Error("Failed to initialize contracts");
            }
            stakingContract = contracts.staking;
            y2kContract = contracts.y2k;
            pogsContract = contracts.pogs;
        }

        // Try each call separately with error handling
        let y2kBalance = '0';
        let stakeInfo = { amount: '0' };
        let totalStaked = '0';
        let earnedRewards = '0';
        let autoCompoundStatus = false;

        try {
            y2kBalance = await y2kContract.methods.balanceOf(userAccount).call();
            console.log("Y2K Balance:", y2kBalance);
        } catch (e) {
            console.error("Error getting Y2K balance:", e);
        }

        try {
            stakeInfo = await stakingContract.methods.stakes(userAccount).call();
            console.log("Stake Info:", stakeInfo);
        } catch (e) {
            console.error("Error getting stake info:", e);
        }

        try {
            totalStaked = await stakingContract.methods.totalStaked().call();
            console.log("Total Staked:", totalStaked);
        } catch (e) {
            console.error("Error getting total staked:", e);
        }

        try {
            earnedRewards = await stakingContract.methods.earned(userAccount).call();
            console.log("Earned Rewards:", earnedRewards);
        } catch (e) {
            console.error("Error getting earned rewards:", e);
        }

        try {
            autoCompoundStatus = await stakingContract.methods.autoCompoundingEnabled().call();
            console.log("Auto Compound Status:", autoCompoundStatus);
        } catch (e) {
            console.error("Error getting auto compound status:", e);
        }

        // Update UI elements
        document.getElementById('y2kBalance').textContent = window.contractConfig.utils.formatAmount(y2kBalance);
        document.getElementById('stakedAmount').textContent = window.contractConfig.utils.formatAmount(stakeInfo.amount);
        document.getElementById('totalStaked').textContent = window.contractConfig.utils.formatAmount(totalStaked);
        document.getElementById('earnedRewards').textContent = window.contractConfig.utils.formatAmount(earnedRewards);
        
        document.getElementById('autoCompoundToggle').checked = autoCompoundStatus;
        document.getElementById('autoCompoundStatus').textContent = autoCompoundStatus ? 'ON' : 'OFF';

        const referralLink = `${window.location.origin}?ref=${userAccount}`;
        document.getElementById('referralLink').value = referralLink;

        console.log("UI update completed successfully");
    } catch (error) {
        console.error("Error in updateUI:", error);
        alert(error.message || "Failed to update dashboard. Check console for details.");
    } finally {
        hideLoading();
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
        showLoading("Staking in progress...");
        const amountWei = web3.utils.toWei(amount, 'ether');

        // Check balance
        const balance = await y2kContract.methods.balanceOf(userAccount).call();
        if (BigInt(balance) < BigInt(amountWei)) {
            throw new Error("Insufficient Y2K balance");
        }

        // Get referral from localStorage if exists
        const referrer = localStorage.getItem('referrer') || '0x0000000000000000000000000000000000000000';

        // Check allowance
        const allowance = await y2kContract.methods.allowance(userAccount, window.contractConfig.addresses.staking).call();
        if (BigInt(allowance) < BigInt(amountWei)) {
            await window.contractConfig.utils.sendTransaction(
                web3,
                y2kContract.methods.approve(window.contractConfig.addresses.staking, amountWei),
                userAccount
            );
        }

        // Stake
        await window.contractConfig.utils.sendTransaction(
            web3,
            stakingContract.methods.stake(amountWei, referrer),
            userAccount
        );

        document.getElementById('stakeAmount').value = '';
        await updateUI();
        alert("Staking successful!");
    } catch (error) {
        console.error("Staking failed:", error);
        alert(window.contractConfig.utils.getErrorMessage(error));
    } finally {
        hideLoading();
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
        showLoading("Unstaking in progress...");
        const amountWei = web3.utils.toWei(amount, 'ether');

        // Check staked balance
        const stakeInfo = await stakingContract.methods.stakes(userAccount).call();
        if (BigInt(stakeInfo.amount) < BigInt(amountWei)) {
            throw new Error("Insufficient staked balance");
        }

        await window.contractConfig.utils.sendTransaction(
            web3,
            stakingContract.methods.unstake(amountWei),
            userAccount
        );

        document.getElementById('unstakeAmount').value = '';
        await updateUI();
        alert("Unstaking successful!");
    } catch (error) {
        console.error("Unstaking failed:", error);
        alert(window.contractConfig.utils.getErrorMessage(error));
    } finally {
        hideLoading();
    }
}

async function claimRewards() {
    if (!userAccount) {
        alert("Please connect your wallet first");
        return;
    }

    try {
        showLoading("Claiming rewards...");
        
        const earnedAmount = await stakingContract.methods.earned(userAccount).call();
        if (BigInt(earnedAmount) <= BigInt(0)) {
            throw new Error("No rewards available to claim");
        }

        await window.contractConfig.utils.sendTransaction(
            web3,
            stakingContract.methods.claimReward(),
            userAccount
        );

        await updateUI();
        alert("Rewards claimed successfully!");
    } catch (error) {
        console.error("Claiming rewards failed:", error);
        alert(window.contractConfig.utils.getErrorMessage(error));
    } finally {
        hideLoading();
    }
}

async function toggleAutoCompounding() {
    if (!userAccount) {
        alert("Please connect your wallet first");
        return;
    }

    const status = document.getElementById('autoCompoundToggle').checked;
    try {
        showLoading(`Auto-compounding ${status ? 'enabling' : 'disabling'}...`);

        await window.contractConfig.utils.sendTransaction(
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
        alert(window.contractConfig.utils.getErrorMessage(error));
    } finally {
        hideLoading();
    }
}

function copyReferralLink() {
    const referralLink = document.getElementById('referralLink');
    referralLink.select();
    document.execCommand('copy');
    alert('Referral link copied to clipboard!');
}

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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM loaded, initializing...");
    try {
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

        console.log("DApp initialized successfully!");
    } catch (error) {
        console.error("Failed to initialize DApp:", error);
    }
});
