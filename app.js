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

    // Rest of your existing functions...
    // (Keep all the other functions from the previous code)

});
