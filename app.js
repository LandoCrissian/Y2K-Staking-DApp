document.addEventListener('DOMContentLoaded', function() {
    // Web3 Variables
    let web3;
    let userAccount;
    const requiredNetwork = '0x19'; // Cronos Mainnet (25 in decimal)

    // UI Elements
    const connectButton = document.getElementById('connectWallet');
    const disconnectButton = document.getElementById('disconnectWallet');
    const networkInfo = document.getElementById('networkInfo');
    const currentNetwork = document.getElementById('currentNetwork');
    const shareTwitterButton = document.getElementById('shareTwitter');
    const copyLinkButton = document.getElementById('copyLink');
    const referralLinkInput = document.getElementById('referralLink');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');

    // Wallet connection message
    const signatureMessage = `Welcome to Y2K Staking!

Please sign this message to verify your wallet ownership and agree to our terms:

• This signature is free and will not trigger a blockchain transaction
• Your signature proves ownership of this wallet
• Never sign messages from untrusted sources

Timestamp: ${new Date().toISOString()}`;

    // Connect Wallet
    async function connectWallet() {
        try {
            loadingOverlay.style.display = 'flex';
            loadingMessage.textContent = 'Connecting Wallet...';

            // Check for various wallet providers
            let provider;
            if (window.ethereum) {
                provider = window.ethereum;
            } else if (window.coinbaseWalletExtension) {
                provider = window.coinbaseWalletExtension;
            } else if (window.deficonnectProvider) {
                provider = window.deficonnectProvider;
            } else if (window.trustwallet) {
                provider = window.trustwallet;
            } else {
                throw new Error('No wallet detected! Please install a Web3 wallet.');
            }

            // Initialize Web3
            web3 = new Web3(provider);

            // Request account access
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            userAccount = accounts[0];

            // Check network
            const networkId = await web3.eth.net.getId();
            const networkName = getNetworkName(networkId);
            currentNetwork.textContent = networkName;
            networkInfo.style.display = 'block';

            // Request signature
            loadingMessage.textContent = 'Please sign the message in your wallet...';
            
            try {
                const signature = await web3.eth.personal.sign(
                    web3.utils.utf8ToHex(signatureMessage),
                    userAccount
                );
                console.log('Signature:', signature);
                
                // Verify signature
                const recoveredAddress = await web3.eth.personal.ecRecover(
                    web3.utils.utf8ToHex(signatureMessage),
                    signature
                );
                
                if (recoveredAddress.toLowerCase() !== userAccount.toLowerCase()) {
                    throw new Error('Signature verification failed');
                }
            } catch (signError) {
                if (signError.code === 4001) {
                    throw new Error('Message signature rejected. Please sign the message to continue.');
                }
                throw signError;
            }

            // Switch to Cronos network if needed
            if (networkId !== 25) {
                try {
                    await provider.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: requiredNetwork }],
                    });
                } catch (switchError) {
                    // If network doesn't exist, add it
                    if (switchError.code === 4902) {
                        try {
                            await provider.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                    chainId: requiredNetwork,
                                    chainName: 'Cronos Mainnet',
                                    nativeCurrency: {
                                        name: 'CRO',
                                        symbol: 'CRO',
                                        decimals: 18
                                    },
                                    rpcUrls: ['https://evm.cronos.org'],
                                    blockExplorerUrls: ['https://cronoscan.com/']
                                }],
                            });
                        } catch (addError) {
                            throw new Error('Failed to add Cronos network');
                        }
                    } else {
                        throw new Error('Please switch to Cronos network manually in your wallet');
                    }
                }
            }

            // Update UI
            updateUI(true);
            showSuccess('Wallet connected successfully!');

            // Generate and display referral link
            generateReferralLink(userAccount);

            // Add network change listener
            provider.on('chainChanged', handleChainChange);
            
            // Add account change listener
            provider.on('accountsChanged', handleAccountChange);

        } catch (error) {
            console.error('Connection Error:', error);
            showError(error.message);
            disconnectWallet();
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }

    // Disconnect Wallet
    function disconnectWallet() {
        userAccount = null;
        updateUI(false);
        referralLinkInput.value = '';
        showSuccess('Wallet disconnected');
    }

    // Update UI based on connection state
    function updateUI(connected) {
        connectButton.style.display = connected ? 'none' : 'block';
        disconnectButton.style.display = connected ? 'block' : 'none';
        networkInfo.style.display = connected ? 'block' : 'none';

        // Update other UI elements based on connection state
        const stakingElements = document.querySelectorAll('.requires-connection');
        stakingElements.forEach(element => {
            element.style.display = connected ? 'block' : 'none';
        });
    }

    // Generate Referral Link
    function generateReferralLink(account) {
        const baseUrl = window.location.origin + window.location.pathname;
        const referralLink = `${baseUrl}?ref=${account}`;
        referralLinkInput.value = referralLink;
    }

    // Handle Chain Change
    function handleChainChange(chainId) {
        const networkName = getNetworkName(parseInt(chainId, 16));
        currentNetwork.textContent = networkName;
        
        if (chainId !== requiredNetwork) {
            showError('Please switch to Cronos Network');
        }
    }

    // Handle Account Change
    function handleAccountChange(accounts) {
        if (accounts.length === 0) {
            disconnectWallet();
        } else if (accounts[0] !== userAccount) {
            userAccount = accounts[0];
            generateReferralLink(userAccount);
            showSuccess('Account changed');
        }
    }

    // Get Network Name
    function getNetworkName(networkId) {
        switch(networkId) {
            case 25:
                return 'Cronos Mainnet';
            case 338:
                return 'Cronos Testnet';
            default:
                return 'Unknown Network';
        }
    }

    // Show Error Message
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'status-message status-error';
        errorDiv.textContent = message;
        
        document.querySelector('main').prepend(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // Show Success Message
    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'status-message status-success';
        successDiv.textContent = message;
        
        document.querySelector('main').prepend(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 5000);
    }

    // Share on Twitter/X
    function shareOnTwitter() {
        const referralLink = referralLinkInput.value;
        const tweetText = encodeURIComponent(
            `🚀 Join me in staking $Y2K and earn $POGs rewards!\n\n` +
            `💎 Use my referral link to get started:\n` +
            `${referralLink}\n\n` +
            `#Y2KCoin #CryptoStaking #POGs #Web3`
        );
        
        window.open(
            `https://twitter.com/intent/tweet?text=${tweetText}`,
            '_blank',
            'width=600,height=400'
        );
    }

    // Copy Referral Link
    async function copyReferralLink() {
        try {
            await navigator.clipboard.writeText(referralLinkInput.value);
            const originalText = copyLinkButton.textContent;
            copyLinkButton.textContent = 'Copied!';
            setTimeout(() => {
                copyLinkButton.textContent = originalText;
            }, 2000);
            showSuccess('Referral link copied to clipboard!');
        } catch (err) {
            showError('Failed to copy link');
        }
    }

    // Check URL for Referral
    function checkReferral() {
        const urlParams = new URLSearchParams(window.location.search);
        const ref = urlParams.get('ref');
        if (ref && web3.utils.isAddress(ref)) {
            localStorage.setItem('referrer', ref);
        }
    }

    // Event Listeners
    connectButton.addEventListener('click', connectWallet);
    disconnectButton.addEventListener('click', disconnectWallet);
    shareTwitterButton.addEventListener('click', shareOnTwitter);
    copyLinkButton.addEventListener('click', copyReferralLink);

    // Check for existing wallet connection on page load
    if (window.ethereum && window.ethereum.selectedAddress) {
        connectWallet();
    }

    // Check for referral on page load
    checkReferral();
});
