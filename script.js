console.log("Y2K Staking DApp Loading...");

let web3;
let stakingContract;
let pogsContract;
let y2kContract;
let userAccount;

async function initializeWeb3() {
    console.log("Initializing Web3...");
    if (typeof window.ethereum !== 'undefined') {
        try {
            web3 = new Web3(window.ethereum);
            console.log("Web3 initialized");

            // Setup event listeners
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', () => window.location.reload());
            window.ethereum.on('disconnect', handleDisconnect);

        } catch (error) {
            console.error("Failed to initialize Web3:", error);
        }
    } else {
        alert("Please install MetaMask to use this dApp.");
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        disconnectWallet();
    } else if (accounts[0] !== userAccount) {
        userAccount = accounts[0];
        updateWalletButton();
    }
}

function handleDisconnect() {
    disconnectWallet();
}

function disconnectWallet() {
    userAccount = null;
    updateWalletButton();
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

        console.log("Requesting accounts...");
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        console.log("Accounts:", accounts);

        if (accounts.length > 0) {
            const message = "Welcome to Y2K Staking!\n\n" +
                          "Click Sign to verify your wallet.\n\n" +
                          "This signature is free and will not trigger a blockchain transaction.\n\n" +
                          "Wallet: " + accounts[0] + "\n" +
                          "Time: " + new Date().toLocaleString();

            try {
                console.log("Requesting signature with message:", message);
                // Convert message to hex
                const msgHex = web3.utils.utf8ToHex(message);
                
                const signature = await window.ethereum.request({
                    method: 'personal_sign',
                    params: [msgHex, accounts[0]]
                });
                
                console.log("Signature verified:", signature);
                userAccount = accounts[0];
                updateWalletButton();
                console.log("Connected:", userAccount);
                
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM loaded, initializing...");
    await initializeWeb3();
    
    // Add event listeners
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);

});
