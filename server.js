const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const qrcode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let qrCodeData = '';
let pairCode = '';
let botStatus = 'Initializing...';
let sock;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('RUKSHAN-KING-BOT-V6')
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCodeData = await qrcode.toDataURL(qr);
            botStatus = 'Scan QR Code Below';
            console.log('QR Generated');
        }
        
        if (connection === 'open') {
            botStatus = 'Bot Connected ✅';
            qrCodeData = '';
            pairCode = '';
            console.log('WhatsApp Connected!');
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            botStatus = 'Disconnected. Reconnecting...';
            if (shouldReconnect) connectToWhatsApp();
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

app.get('/', async (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>RUKSHAN KING BOT V6 - Web Pair</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: sans-serif; background: #0a1014; color: #fff; text-align: center; padding: 20px; }
            .container { background: #1f2c33; padding: 25px; border-radius: 20px; max-width: 420px; margin: 20px auto; box-shadow: 0 8px 16px rgba(0,0,0,0.4); }
            h1 { color: #00a884; margin-bottom: 5px; }
            input, button { width: 100%; padding: 14px; margin: 10px 0; border-radius: 10px; border: none; font-size: 16px; box-sizing: border-box; }
            button { background: #00a884; color: #fff; font-weight: bold; cursor: pointer; }
            .qr { background: #fff; padding: 15px; border-radius: 15px; display: inline-block; margin: 15px 0; }
            .code { font-size: 32px; letter-spacing: 8px; color: #00a884; font-weight: bold; background: #0a1014; padding: 10px; border-radius: 10px; }
            .status { color: #8696a0; font-size: 14px; }
            .footer { margin-top: 20px; font-size: 12px; color: #8696a0; }
        </style>
    </head>
    <body>
        <h1>👑 RUKSHAN KING BOT V6</h1>
        <p class="status">Status: ${botStatus}</p>
        <div class="container">
            ${qrCodeData ? `<h3>Scan QR Code</h3><div class="qr"><img src="${qrCodeData}" width="250"/></div><p>WhatsApp > Linked Devices > Link Device</p>` : ''}
            
            ${!qrCodeData && botStatus !== 'Bot Connected ✅' ? `
            <h3>Or Use Pairing Code</h3>
            <form method="POST" action="/pair">
                <input name="number" type="number" placeholder="947XXXXXXXX without +" required />
                <button type="submit">Get Pair Code</button>
            </form>
            ${pairCode ? `<p>Your Pair Code:</p><div class="code">${pairCode}</div><p>WhatsApp > Linked Devices > Link with phone number</p>` : ''}
            ` : ''}
            
            ${botStatus === 'Bot Connected ✅' ? '<h2>🎉 Bot is Online!</h2><p>You can close this page now.</p>' : ''}
        </div>
        <p class="footer">Made with 💗 by Rukshan Maduwa | 1-Click Deploy System</p>
        <script>setTimeout(() => location.reload(), 4000);</script>
    </body>
    </html>
    `);
});

app.post('/pair', async (req, res) => {
    const number = req.body.number?.replace(/[^0-9]/g, '');
    if (!number) return res.redirect('/');
    
    try {
        if (!sock.authState.creds.registered) {
            pairCode = await sock.requestPairingCode(number);
            botStatus = 'Enter Pair Code in WhatsApp';
        }
    } catch (e) {
        console.log('Pair code error:', e);
        botStatus = 'Error. Use QR Scan instead.';
    }
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    connectToWhatsApp();
});
