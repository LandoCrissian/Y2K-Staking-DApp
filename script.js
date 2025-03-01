console.log("Y2K Staking DApp Loading...");

let web3;
let stakingContract;
let pogsContract;
let y2kContract;
let userAccount;

// 🚀 **Wait for Contract Config**
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

// 🚀 **Initialize Web3 & Contracts**
async function initializeWeb3() {
    console.log("Initializing Web3...");

    try {
        const config = await waitForContractConfig();
        if (!config) {
            throw new Error("Contract configuration not loaded");
        }

        if (typeof window.ethereum === 'undefined') {
            throw new Error("Please install MetaMask to use this dApp.");
        }

        web3 = new Web3(window.ethereum);

        // Load Contracts
        const contracts = await config.initializeContracts(web3);
        if (!contracts) {
            throw new Error("Failed to initialize contracts");
        }

        stakingContract = contracts.staking;
        pogsContract = contracts.pogs;
        y2kContract = contracts.y2k;

        // Handle Wallet Events
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        window.ethereum.on('disconnect', handleDisconnect);

        console.log("Web3 Initialized!");
    } catch (error) {
        console.error("Initialization error:", error);
        alert(error.message || "Failed to initialize. Please check your wallet connection.");
    }
}

// 🌐 **Handle Chain & Account Changes**
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

// 🔌 **Disconnect Wallet**
function disconnectWallet() {
    userAccount = null;
    updateWalletButton();
    resetUI();
}

// 🔄 **Reset UI**
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

// 🔄 **Update Wallet Button**
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
// 🔗 **Connect Wallet with Signature Verification**
async function connectWallet() {
    try {
        if (!window.ethereum) {
            throw new Error("Please install MetaMask!");
        }

        const config = await waitForContractConfig();
        if (!config) {
            throw new Error("DApp not properly initialized");
        }

        await config.networkUtils.verifyNetwork(window.ethereum);

        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });

        if (accounts.length > 0) {
            const message = `Welcome to Y2K Staking!\n\nSign to verify your wallet: ${accounts[0]}`;
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
        alert(window.contractConfig?.utils.getErrorMessage(error) || error.message);
    }
}
