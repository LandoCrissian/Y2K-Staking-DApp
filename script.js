console.log("Y2K Staking DApp Loading...");

// Global Variables
let web3;
let stakingContract;
let pogsContract;
let y2kContract;
let userAccount;

// Contract Config Check
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

        setTimeout(() => {
            clearInterval(checkConfig);
            resolve(null);
        }, 5000);
    });
}

// Initialize Web3 and Contracts
async function initializeWeb3() {
    console.log("Initializing Web3...");
    
    try {
        // Wait for and verify contract config
        const config = await waitForContractConfig();
        if (!config) {
            throw new Error("Contract configuration not loaded");
        }
        console.log("Contract config loaded");

        // Check for MetaMask
        if (typeof window.ethereum === 'undefined') {
            throw new Error("Please install MetaMask to use this dApp.");
        }

        // Initialize Web3
        web3 = new Web3(window.ethereum);
        console.log("Web3 initialized:", web3.version);

        // Set up contracts
        const contracts = await config.initializeContracts(web3);
        if (!contracts) {
            throw new Error("Failed to initialize contracts");
        }

        stakingContract = contracts.staking;
        pogsContract = contracts.pogs;
        y2kContract = contracts.y2k;

        console.log("Contracts initialized:", {
            staking: stakingContract._address,
            pogs: pogsContract._address,
            y2k: y2kContract._address
        });

        // Set up event listeners
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());
        window.ethereum.on('disconnect', handleDisconnect);

        console.log("Initialization complete!");
        return true;
    } catch (error) {
        console.error("Initialization error:", error);
        alert(error.message || "Failed to initialize. Please check your wallet connection.");
        return false;
    }
}

// Network Verification
async function verifyNetwork() {
    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const expectedChainId = window.contractConfig.network.chainId;
        console.log("Chain ID Check:", { current: chainId, expected: expectedChainId });

        if (chainId !== expectedChainId) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: expectedChainId }],
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
    } catch (error) {
        console.error("Network verification failed:", error);
        return false;
    }
}
// Wallet Connection Handling
async function connectWallet() {
    try {
        console.log("Starting wallet connection...");
        if (!window.ethereum) {
            throw new Error("Please install MetaMask!");
        }

        // Verify config and network
        const config = await waitForContractConfig();
        if (!config) {
            throw new Error("DApp not properly initialized");
        }

        const networkVerified = await verifyNetwork();
        if (!networkVerified) {
            throw new Error("Please switch to Cronos network");
        }

        // Request account access
        console.log("Requesting accounts...");
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });

        if (accounts.length > 0) {
            userAccount = accounts[0];
            console.log("Connected to account:", userAccount);
            
            // Update UI
            updateWalletButton();
            await updateUI();
            return true;
        }
        
        throw new Error("No accounts found");
    } catch (error) {
        console.error("Connection error:", error);
        alert(error.message);
        return false;
    }
}

// Account Change Handlers
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
    resetUI();
}

// UI Updates
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

function resetUI() {
    const elements = {
        'stakedAmount': '0',
        'burnedRewards': '0',
        'apyPercentage': '0',
        'totalStaked': '0',
        'earnedRewards': '0',
        'y2kBalance': '0',
        'referralLink': '',
        'autoCompoundStatus': 'OFF'
    };

    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            if (element.tagName === 'INPUT') {
                element.value = value;
            } else {
                element.textContent = value;
            }
        }
    }

    const autoCompoundToggle = document.getElementById('autoCompoundToggle');
    if (autoCompoundToggle) {
        autoCompoundToggle.checked = false;
    }
}

async function updateUI() {
    if (!userAccount) {
        console.log("No user account, skipping UI update");
        return;
    }

    try {
        console.log("Updating UI for account:", userAccount);
        showLoading("Updating dashboard...");

        // Verify contracts
        if (!stakingContract || !y2kContract || !pogsContract) {
            console.log("Reinitializing contracts...");
            await initializeWeb3();
        }

        // Fetch all data in parallel
        const [y2kBalance, stakeInfo, totalStaked, earnedRewards, autoCompoundStatus] = await Promise.all([
            y2kContract.methods.balanceOf(userAccount).call(),
            stakingContract.methods.stakes(userAccount).call(),
            stakingContract.methods.totalStaked().call(),
            stakingContract.methods.earned(userAccount).call(),
            stakingContract.methods.autoCompoundingEnabled().call()
        ].map(p => p.catch(e => {
            console.error("Error fetching data:", e);
            return '0';
        })));

        // Update UI with formatted values
        const updates = {
            'y2kBalance': y2kBalance,
            'stakedAmount': stakeInfo.amount || '0',
            'totalStaked': totalStaked,
            'earnedRewards': earnedRewards,
        };

        for (const [id, value] of Object.entries(updates)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = formatAmount(value);
            }
        }

        // Update auto-compound status
        const autoCompoundToggle = document.getElementById('autoCompoundToggle');
        const autoCompoundStatus = document.getElementById('autoCompoundStatus');
        if (autoCompoundToggle && autoCompoundStatus) {
            autoCompoundToggle.checked = autoCompoundStatus;
            autoCompoundStatus.textContent = autoCompoundStatus ? 'ON' : 'OFF';
        }

        // Update referral link
        const referralLink = document.getElementById('referralLink');
        if (referralLink) {
            referralLink.value = `${window.location.origin}?ref=${userAccount}`;
        }

        console.log("UI update completed");
    } catch (error) {
        console.error("Error updating UI:", error);
    } finally {
        hideLoading();
    }
}

// Helper function for amount formatting
function formatAmount(amount) {
    try {
        const number = web3.utils.fromWei(amount, 'ether');
        return parseFloat(number).toFixed(3);
    } catch (error) {
        console.error("Format error:", error);
        return '0.000';
    }
}
// Staking Functions
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
        showLoading("Preparing to stake...");
        const amountWei = web3.utils.toWei(amount.toString(), 'ether');
        console.log("Staking amount:", amount, "Y2K (", amountWei, "wei)");

        // Check Y2K balance
        const balance = await y2kContract.methods.balanceOf(userAccount).call();
        console.log("Current Y2K balance:", web3.utils.fromWei(balance, 'ether'));
        
        if (BigInt(balance) < BigInt(amountWei)) {
            throw new Error(`Insufficient Y2K balance. You have ${web3.utils.fromWei(balance, 'ether')} Y2K`);
        }

        // Check and handle allowance
        showLoading("Checking allowance...");
        const allowance = await y2kContract.methods.allowance(userAccount, stakingContract._address).call();
        console.log("Current allowance:", web3.utils.fromWei(allowance, 'ether'));

        if (BigInt(allowance) < BigInt(amountWei)) {
            showLoading("Approving tokens...");
            try {
                const gasEstimate = await y2kContract.methods.approve(stakingContract._address, amountWei)
                    .estimateGas({ from: userAccount });
                
                const approvalTx = await y2kContract.methods.approve(stakingContract._address, amountWei)
                    .send({
                        from: userAccount,
                        gas: Math.floor(gasEstimate * 1.2)
                    });
                console.log("Approval transaction:", approvalTx.transactionHash);
            } catch (approvalError) {
                console.error("Approval failed:", approvalError);
                throw new Error("Failed to approve token transfer. Please try again.");
            }
        }

        // Get referral from localStorage if exists
        const referrer = localStorage.getItem('referrer') || '0x0000000000000000000000000000000000000000';
        console.log("Using referrer:", referrer);

        // Perform stake
        showLoading("Staking tokens...");
        const gasEstimate = await stakingContract.methods.stake(amountWei, referrer)
            .estimateGas({ from: userAccount });
        
        const stakeTx = await stakingContract.methods.stake(amountWei, referrer)
            .send({
                from: userAccount,
                gas: Math.floor(gasEstimate * 1.2)
            });

        console.log("Stake transaction:", stakeTx.transactionHash);
        document.getElementById('stakeAmount').value = '';
        await updateUI();
        alert("Staking successful!");
    } catch (error) {
        console.error("Staking failed:", error);
        handleTransactionError(error);
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
        showLoading("Preparing to unstake...");
        const amountWei = web3.utils.toWei(amount.toString(), 'ether');
        console.log("Unstaking amount:", amount, "Y2K (", amountWei, "wei)");

        // Check staked balance
        const stakeInfo = await stakingContract.methods.stakes(userAccount).call();
        console.log("Current staked balance:", web3.utils.fromWei(stakeInfo.amount, 'ether'));
        
        if (BigInt(stakeInfo.amount) < BigInt(amountWei)) {
            throw new Error(`Insufficient staked balance. You have ${web3.utils.fromWei(stakeInfo.amount, 'ether')} Y2K staked`);
        }

        // Perform unstake
        showLoading("Unstaking tokens...");
        const gasEstimate = await stakingContract.methods.unstake(amountWei)
            .estimateGas({ from: userAccount });
        
        const unstakeTx = await stakingContract.methods.unstake(amountWei)
            .send({
                from: userAccount,
                gas: Math.floor(gasEstimate * 1.2)
            });

        console.log("Unstake transaction:", unstakeTx.transactionHash);
        document.getElementById('unstakeAmount').value = '';
        await updateUI();
        alert("Unstaking successful!");
    } catch (error) {
        console.error("Unstaking failed:", error);
        handleTransactionError(error);
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
        showLoading("Checking rewards...");
        const earnedAmount = await stakingContract.methods.earned(userAccount).call();
        console.log("Earned rewards:", web3.utils.fromWei(earnedAmount, 'ether'));

        if (BigInt(earnedAmount) <= BigInt(0)) {
            throw new Error("No rewards available to claim");
        }

        showLoading("Claiming rewards...");
        const gasEstimate = await stakingContract.methods.claimReward()
            .estimateGas({ from: userAccount });
        
        const claimTx = await stakingContract.methods.claimReward()
            .send({
                from: userAccount,
                gas: Math.floor(gasEstimate * 1.2)
            });

        console.log("Claim transaction:", claimTx.transactionHash);
        await updateUI();
        alert("Rewards claimed successfully!");
    } catch (error) {
        console.error("Claiming rewards failed:", error);
        handleTransactionError(error);
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
        showLoading(`${status ? 'Enabling' : 'Disabling'} auto-compounding...`);
        
        const gasEstimate = await stakingContract.methods.toggleAutoCompounding(status)
            .estimateGas({ from: userAccount });
        
        const toggleTx = await stakingContract.methods.toggleAutoCompounding(status)
            .send({
                from: userAccount,
                gas: Math.floor(gasEstimate * 1.2)
            });

        console.log("Toggle transaction:", toggleTx.transactionHash);
        document.getElementById('autoCompoundStatus').textContent = status ? 'ON' : 'OFF';
        await updateUI();
        alert(`Auto-compounding ${status ? 'enabled' : 'disabled'} successfully!`);
    } catch (error) {
        console.error("Auto-compounding toggle failed:", error);
        document.getElementById('autoCompoundToggle').checked = !status;
        handleTransactionError(error);
    } finally {
        hideLoading();
    }
}
// Utility Functions
function handleTransactionError(error) {
    let message = "Transaction failed: ";
    
    if (error.code === 4001) {
        message = "Transaction rejected. Please try again.";
    } else if (error.message.includes("insufficient funds")) {
        message = "Insufficient CRO for gas fees.";
    } else if (error.message.includes("execution reverted")) {
        message = "Transaction rejected by the contract. Please check your input amount.";
    } else if (error.message.includes("gas required exceeds allowance")) {
        message = "Transaction requires more gas than available. Please try a smaller amount.";
    } else {
        message += error.message;
    }
    
    alert(message);
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

function copyReferralLink() {
    const referralLink = document.getElementById('referralLink');
    if (!referralLink) return;

    try {
        referralLink.select();
        document.execCommand('copy');
        alert('Referral link copied to clipboard!');
    } catch (error) {
        console.error("Copy failed:", error);
        alert('Failed to copy referral link');
    }
}

// MAX button functionality
function setMaxStakeAmount() {
    if (!userAccount || !y2kContract) return;
    
    y2kContract.methods.balanceOf(userAccount).call()
        .then(balance => {
            document.getElementById('stakeAmount').value = 
                web3.utils.fromWei(balance, 'ether');
        })
        .catch(error => {
            console.error("Error getting max stake amount:", error);
        });
}

function setMaxUnstakeAmount() {
    if (!userAccount || !stakingContract) return;
    
    stakingContract.methods.stakes(userAccount).call()
        .then(stake => {
            document.getElementById('unstakeAmount').value = 
                web3.utils.fromWei(stake.amount, 'ether');
        })
        .catch(error => {
            console.error("Error getting max unstake amount:", error);
        });
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Initializing DApp...");
    try {
        // Initialize Web3 and contracts
        const initialized = await initializeWeb3();
        if (!initialized) {
            console.error("Failed to initialize Web3");
            return;
        }

        // Add event listeners for all buttons
        const eventListeners = {
            'connectWallet': connectWallet,
            'disconnectWallet': disconnectWallet,
            'stakeButton': stakeY2K,
            'unstakeButton': unstakeY2K,
            'claimRewards': claimRewards,
            'autoCompoundToggle': toggleAutoCompounding,
            'maxStake': setMaxStakeAmount,
            'maxUnstake': setMaxUnstakeAmount
        };

        for (const [id, handler] of Object.entries(eventListeners)) {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'autoCompoundToggle') {
                    element.addEventListener('change', handler);
                } else {
                    element.addEventListener('click', handler);
                }
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
        }

        // Check for referral in URL
        const urlParams = new URLSearchParams(window.location.search);
        const referrer = urlParams.get('ref');
        if (referrer && web3.utils.isAddress(referrer)) {
            localStorage.setItem('referrer', referrer);
            console.log("Referrer saved:", referrer);
        }

        // Try to restore previous connection
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
            userAccount = accounts[0];
            updateWalletButton();
            await updateUI();
        }

        console.log("DApp initialization complete!");
    } catch (error) {
        console.error("Failed to initialize DApp:", error);
        alert("Failed to initialize DApp. Please refresh the page and try again.");
    }
});

// Add window error handler for unhandled errors
window.onerror = function(message, source, lineno, colno, error) {
    console.error("Global error:", {message, source, lineno, colno, error});
    return false;
};

// Add unhandled promise rejection handler
window.onunhandledrejection = function(event) {
    console.error("Unhandled promise rejection:", event.reason);
};
