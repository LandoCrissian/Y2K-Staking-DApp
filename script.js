if (typeof window.ethereum === 'undefined' && typeof window.web3 === 'undefined') {
    console.warn("⚠️ No Web3 provider detected.");
}

let web3;
let stakingContract;
let pogsContract;
let y2kContract;
let userAccount = null;
let hasSigned = false; // ✅ Prevents duplicate signature prompts

// 🚀 **Initialize Web3 & Contracts**
async function initializeWeb3() {
    console.log("🔹 Initializing Web3...");

    if (window.ethereum) {
        console.log("✅ MetaMask (or Web3 provider) detected.");
        web3 = new Web3(window.ethereum);
    } else {
        console.error("❌ No Web3 provider found.");
        alert("No Web3 provider detected. Please install MetaMask or use a Web3-compatible browser.");
        return;
    }

    try {
        console.log("🔹 Fetching contract configurations...");
        const contracts = await window.contractConfig.initializeContracts(web3);
        if (!contracts) throw new Error("Failed to load contracts.");

        stakingContract = contracts.staking;
        pogsContract = contracts.pogs;
        y2kContract = contracts.y2k;

        console.log("✅ Contracts initialized successfully.");
        setupWalletListeners();
    } catch (error) {
        console.error("❌ Contract Initialization Error:", error);
        alert(error.message || "Failed to initialize contracts.");
    }
}

// 🔗 **Connect Wallet & Verify Signature**
async function connectWallet() {
    console.log("🔹 Attempting wallet connection...");

    if (!window.ethereum) {
        alert("MetaMask is not installed. Please install it to continue.");
        return;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (accounts.length === 0) {
            alert("Wallet connection failed. No accounts found.");
            return;
        }

        userAccount = accounts[0];
        console.log("✅ Wallet connected:", userAccount);

        // ✅ If user is already signed, prevent re-signing
        if (hasSigned) {
            console.log("✅ Already signed, skipping signature request.");
            updateWalletButton();
            await updateUI();
            return;
        }

        const message = `Welcome to Y2K Staking!\n\nSign this message to verify your wallet.\n\nAddress: ${userAccount}`;
        try {
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [web3.utils.utf8ToHex(message), userAccount],
            });

            console.log("✅ Signature Verified:", signature);
            alert("Wallet connected and verified!");
            hasSigned = true; // ✅ Signature locked for session

            updateWalletButton();
            await updateUI();
        } catch (signError) {
            console.error("❌ Signature Error:", signError);
            alert("Signature declined. Please sign the message to connect your wallet.");
            hasSigned = false; // Prevent lock if declined
        }
    } catch (error) {
        console.error("❌ Wallet Connection Error:", error);
        alert("Failed to connect wallet.");
    }
}

// 🔄 **Handle Wallet Events**
function setupWalletListeners() {
    if (!window.ethereum) return;

    window.ethereum.on("chainChanged", () => {
        console.warn("🔄 Chain changed, reloading...");
        window.location.reload();
    });

    window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
            disconnectWallet();
        } else {
            userAccount = accounts[0];
            updateWalletButton();
            updateUI();
        }
    });

    window.ethereum.on("disconnect", () => {
        console.warn("🔌 Wallet disconnected.");
        disconnectWallet();
    });
}

// 🔌 **Disconnect Wallet**
function disconnectWallet() {
    console.log("🔌 Disconnecting wallet...");
    userAccount = null;
    hasSigned = false; // ✅ Reset session on disconnect
    updateWalletButton();
    resetUI();
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

// 🔄 **Update UI with Data**
async function updateUI() {
    if (!userAccount) return;

    console.log("🔹 Updating Dashboard...");

    try {
        showLoading("Updating dashboard...");

        // ✅ Fetch Y2K Balance
        try {
            const y2kBalance = await y2kContract.methods.balanceOf(userAccount).call();
            document.getElementById('y2kBalance').textContent = web3.utils.fromWei(y2kBalance);
            console.log("✅ Y2K Balance:", y2kBalance);
        } catch (error) {
            console.warn("⚠️ Could not fetch Y2K balance, skipping...");
        }

        // ✅ Fetch Staked Amount
        try {
            const stakeInfo = await stakingContract.methods.stakes(userAccount).call();
            document.getElementById('stakedAmount').textContent = web3.utils.fromWei(stakeInfo.amount);
            console.log("✅ Staked Amount:", stakeInfo.amount);
        } catch (error) {
            console.warn("⚠️ Could not fetch Staked Amount, skipping...");
        }

        // ✅ Fetch Total Staked in Contract
        try {
            const totalStaked = await stakingContract.methods.totalStaked().call();
            document.getElementById('totalStaked').textContent = web3.utils.fromWei(totalStaked);
            console.log("✅ Total Y2K Staked:", totalStaked);
        } catch (error) {
            console.warn("⚠️ Could not fetch Total Staked, skipping...");
        }

        hideLoading();
        console.log("✅ Dashboard Updated Successfully");

    } catch (error) {
        console.error("❌ UI Update Error:", error);
        alert("Failed to update dashboard.");
        hideLoading();
    }
}

// 🔄 **Initialize DApp on Load**
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM loaded, initializing...");
    await initializeWeb3();
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);
});
