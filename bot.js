const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const moment = require("moment-timezone");
const axios = require("axios");
const yt = require("yt-search");
const fs = require("fs");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

const ownerName = "Rukshan";
const botName = "RUKSHAN BOT KING V6";
const prefix = ".";
// ===== OWNER NUMBER - pm2 logs rukshan-bot වලින් පේන Number එක මෙතන දාපන් =====
const ownerNumber = "94703916353@s.whatsapp.net"; // Example: 94703916353@s.whatsapp.net
// ============================================================================
const songCache = {};

// ===== CUSTOM MENU STORAGE =====
let customMenu = null;
const MENU_FILE = './custom_menu.txt';

// Load custom menu if exists
if (fs.existsSync(MENU_FILE)) {
    customMenu = fs.readFileSync(MENU_FILE, 'utf8');
}

// Termux ffmpeg path
const FFMPEG_PATH = "/data/data/com.termux/files/usr/bin/ffmpeg";

function runtime(seconds) {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

// ===== RESOLVE REDIRECT URL - FB SHARE FIX =====
async function resolveURL(url) {
    try {
        console.log(`Resolving URL: ${url}`);
        const response = await axios.get(url, {
            maxRedirects: 5,
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        console.log(`Resolved to: ${response.request.res.responseUrl || url}`);
        return response.request.res.responseUrl || url;
    } catch (e) {
        console.log(`URL Resolve Error: ${e.message}`);
        return url;
    }
}

// ===== YT-DLP MAX SPEED - UNIVERSAL DOWNLOADER =====
async function getYTMP3(url) {
    try {
        console.log(` MAX SPEED MP3 Download...`);
        const randomId = Math.floor(Math.random() * 10000);
        const outputFile = `./temp_${randomId}.mp3`;
        await execAsync(`yt-dlp -x --audio-format mp3 --audio-quality 128K --no-write-thumbnail --external-downloader aria2c --external-downloader-args "-x 32 -s 32 -k 2M --console-log-level=error" -o "${outputFile}" "${url}"`);
        const buffer = fs.readFileSync(outputFile);
        fs.unlinkSync(outputFile);
        return buffer;
    } catch (e) {
        console.log(` yt-dlp failed: ${e}`);
        throw new Error('yt-dlp failed');
    }
}

async function getYTMP4(url) {
    try {
        console.log(`[VIDEO] MAX SPEED Video Download...`);
        const randomId = Math.floor(Math.random() * 10000);
        const outputFile = `./temp_${randomId}.mp4`;
        await execAsync(`yt-dlp -f "worstvideo[ext=mp4]+worstaudio[ext=m4a]/worst[ext=mp4]/worst" --no-write-thumbnail --external-downloader aria2c --external-downloader-args "-x 32 -s 32 -k 2M --console-log-level=error" -o "${outputFile}" "${url}"`);
        const buffer = fs.readFileSync(outputFile);
        fs.unlinkSync(outputFile);
        return buffer;
    } catch (e) {
        console.log(`[VIDEO] yt-dlp failed: ${e}`);
        throw new Error('yt-dlp failed');
    }
}

// ===== UNIVERSAL VIDEO DOWNLOAD - FB/IG/TIKTOK FIX =====
async function getUniversalVideo(url) {
    try {
        console.log(`[UNIVERSAL] Downloading: ${url}`);
        const realUrl = await resolveURL(url);
        console.log(`[UNIVERSAL] Real URL: ${realUrl}`);
        const randomId = Math.floor(Math.random() * 10000);
        const outputFile = `./temp_${randomId}.mp4`;
        // yt-dlp supports FB, IG, TikTok, Twitter all + cookies + no-check-certificate
        await execAsync(`yt-dlp -f "best[ext=mp4]/best" --no-check-certificate --no-write-thumbnail --external-downloader aria2c --external-downloader-args "-x 32 -s 32 -k 2M --console-log-level=error" -o "${outputFile}" "${realUrl}"`);
        const buffer = fs.readFileSync(outputFile);
        fs.unlinkSync(outputFile);
        return buffer;
    } catch (e) {
        console.log(`[UNIVERSAL] yt-dlp failed: ${e}`);
        throw new Error('Download failed');
    }
}

// ===== BAILEYS 6.x DOWNLOAD FIX =====
async function downloadMedia(msg) {
    const stream = await downloadContentFromMessage(msg, msg.mimetype.split('/')[0]);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

// ===== OWNER CHECK - FIXED =====
function isOwner(sender) {
    // Remove device ID :xx@ and compare
    const cleanSender = sender.split(':')[0] + '@s.whatsapp.net';
    const cleanOwner = ownerNumber.split(':')[0] + '@s.whatsapp.net';
    console.log(`Owner Check: ${cleanSender} === ${cleanOwner}`);
    return cleanSender === cleanOwner;
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: [botName, "Chrome", "1.0.0"],
        getMessage: async (key) => {
            return { conversation: "RUKSHAN BOT KING V6" };
        }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('\n📱 QR CODE එක SCAN කරපන්:\n');
            qrcode.generate(qr, { small: true });
        }
        if (connection === "close") {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === "open") {
            console.log(`\n✅ ${botName} Online! 👑`);
            console.log(`👑 Owner Number: ${ownerNumber}`);
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        // ===== VIEW ONCE DETECTION =====
        let viewOnceMsg = m.message.viewOnceMessageV2 || m.message.viewOnceMessage;
        if (viewOnceMsg) {
            m.message = viewOnceMsg.message;
        }

        const msgText = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || "";
        const from = m.key.remoteJid;
        const sender = m.key.participant || m.key.remoteJid;
        const pushname = m.pushName || "User";
        const time = moment().tz('Asia/Colombo').format('HH:mm:ss');
        const date = moment().tz('Asia/Colombo').format('DD/MM/YYYY');
        const isImage = m.message.imageMessage;
        const isVideo = m.message.videoMessage;
        const isQuotedImage = m.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
        const isQuotedVideo = m.message.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;

        // ===== SONG REPLY HANDLER - FIXED =====
        if (/^[12]$/.test(msgText.trim()) && songCache[sender]) {
            const choice = msgText.trim();
            const songData = songCache[sender];
            let msg = await sock.sendMessage(from, { text: "⚡ *Sending Song...*" });
            try {
                const fileSizeMB = songData.buffer.length / (1024 * 1024);
                console.log(`Song Size: ${fileSizeMB.toFixed(2)}MB - Sending...`);

                if (choice === "1") {
                    // Audio with Logo - Check Size
                    if (fileSizeMB > 16) {
                        await sock.sendMessage(from, { text: "⚠️ *File too large for Audio!*\n*Sending as Document...*", edit: msg.key });
                        await sock.sendMessage(from, {
                            document: songData.buffer,
                            mimetype: 'audio/mpeg',
                            fileName: songData.title + '.mp3',
                            caption: '*🎵 ' + songData.title + '*\n*⚡ MAX SPEED 128kbps*'
                        });
                    } else {
                        await sock.sendMessage(from, {
                            audio: songData.buffer,
                            mimetype: 'audio/mpeg',
                            fileName: songData.title + '.mp3',
                            contextInfo: {
                                externalAdReply: {
                                    title: songData.title,
                                    body: songData.author + ' | ' + botName,
                                    thumbnailUrl: songData.thumb,
                                    sourceUrl: songData.ytUrl,
                                    mediaType: 2,
                                    renderLargerThumbnail: true
                                }
                            }
                        });
                    }
                } else {
                    // Document - MP3 Format
                    await sock.sendMessage(from, {
                        document: songData.buffer,
                        mimetype: 'audio/mpeg',
                        fileName: songData.title + '.mp3',
                        caption: '*🎵 ' + songData.title + '*\n*⚡ MAX SPEED 128kbps*'
                    });
                }
                await sock.sendMessage(from, { text: "✅ *Song Sent!*", edit: msg.key });
                delete songCache[sender];
            } catch (e) {
                console.log(`Song Send Error: ${e}`);
                await sock.sendMessage(from, { text: `❌ *Send Failed!*\n*Error:* ${e.message}\n*Try Document Option (2)*`, edit: msg.key });
            }
            return;
        }

        if (!msgText.startsWith(prefix)) return;
        const args = msgText.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const q = args.join(" ");

        // ===== SETMENU - OWNER ONLY FIXED =====
        if (command === "setmenu") {
            if (!isOwner(sender)) {
                return await sock.sendMessage(from, { text: "❌ *Owner Only Command!*\n*මේක Ownerට විතරයි පුළුවන්* 👑\n\n*Your Number:* " + sender });
            }
            if (!q) {
                return await sock.sendMessage(from, { text: `*Usage:* ${prefix}setmenu <text>\n\n*Example:*\n${prefix}setmenu 🤖 *MY BOT* 👑\n\n*Reset:* ${prefix}setmenu reset\n\n*Placeholders:* {uptime} {time} {date} {user}` });
            }
            if (q.toLowerCase() === 'reset') {
                customMenu = null;
                if (fs.existsSync(MENU_FILE)) fs.unlinkSync(MENU_FILE);
                return await sock.sendMessage(from, { text: "✅ *Menu Reset!*\n*Default Menu Active* 👑" });
            }
            customMenu = q;
            fs.writeFileSync(MENU_FILE, q);
            return await sock.sendMessage(from, { text: "✅ *Custom Menu Set!*\n*Type.menu to see* 👑" });
        }

        if (command === "menu") {
            const uptime = runtime(process.uptime());
            let menuText;
            
            if (customMenu) {
                // Use Custom Menu
                menuText = customMenu.replace(/{uptime}/g, uptime).replace(/{time}/g, time).replace(/{date}/g, date).replace(/{user}/g, pushname);
            } else {
                // Default Menu
                menuText = '╔══════════════════════════════╗\n║ 🤖 *' + botName + '* 👑\n╚══════════════════════════════╝\n\n╭─❒ *📊 BOT INFO*\n│ 👑 *Owner:* ' + ownerName + '\n│ ⚡ *Prefix:* [ ' + prefix + ' ]\n│ 🕐 *Time:* ' + time + ' | 📅 ' + date + '\n│ 🔥 *Uptime:* ' + uptime + '\n│ 👤 *User:* ' + pushname + '\n╰────────────────────\n\n╭─❒ *📌 MAIN*\n│ ➛ ' + prefix + 'menu - All Commands\n│ ➛ ' + prefix + 'ping - Check Speed\n│ ➛ ' + prefix + 'alive - Bot Status\n│ ➛ ' + prefix + 'owner - Owner Info\n│ ➛ ' + prefix + 'runtime - Bot Uptime\n╰────────────────────\n\n╭─❒ *🎵 DOWNLOADER*\n│ ➛ ' + prefix + 'song - YT Audio + Logo\n│ ➛ ' + prefix + 'video - YouTube Video\n│ ➛ ' + prefix + 'tiktok - TikTok No WM\n│ ➛ ' + prefix + 'fb - Facebook Video\n│ ➛ ' + prefix + 'ig - Instagram Download\n│ ➛ ' + prefix + 'twitter - Twitter/X Video\n│ ➛ ' + prefix + 'mediafire - MediaFire Download\n│ ➛ ' + prefix + 'gdrive - Google Drive Download\n│ ➛ ' + prefix + 'gitclone - GitHub Repo\n│ ➛ ' + prefix + 'apk - APK Download\n│ ➛ ' + prefix + 'yts - YouTube Search\n│ ➛ ' + prefix + 'lyrics - Song Lyrics\n╰────────────────────\n\n╭─❒ *🎨 CONVERTER*\n│ ➛ ' + prefix + 'sticker - Image to Sticker\n│ ➛ ' + prefix + 'toimg - Sticker to Image\n│ ➛ ' + prefix + 'save - Save ViewOnce\n│ ➛ ' + prefix + 'emojimix - Mix 2 Emojis\n│ ➛ ' + prefix + 'qc - Quote Chat Sticker\n│ ➛ ' + prefix + 'blur - Blur Image\n│ ➛ ' + prefix + 'circle - Circle Crop\n│ ➛ ' + prefix + 'invert - Invert Colors\n│ ➛ ' + prefix + 'jail - Jail Image\n╰────────────────────\n\n╭─❒ *👑 OWNER*\n│ ➛ ' + prefix + 'setmenu - Set Custom Menu\n╰────────────────────\n\n╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n┃ © 2026 ' + botName + ' 👑\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯';
            }
            await sock.sendMessage(from, { text: menuText });
        }

        else if (command === "ping") {
            const start = Date.now();
            let msg = await sock.sendMessage(from, { text: "*🏓 Pinging...*" });
            const speed = Date.now() - start;
            await sock.sendMessage(from, { text: `*⚡ Pong!* ${speed}ms\n*Status:* 🟢 Super Fast`, edit: msg.key });
        }
        else if (command === "alive") {
            await sock.sendMessage(from, { text: `*🤖 ${botName} Online!*\n*✅ Status:* Active\n*🔥 Uptime:* ${runtime(process.uptime())}\n*👑 Owner:* ${ownerName}` });
        }
        else if (command === "owner") {
            await sock.sendMessage(from, { text: `*👑 Owner:* ${ownerName}\n*📞 Number:* wa.me/${ownerNumber.replace('@s.whatsapp.net', '')}\n*🔍 Your ID:* ${sender}` });
        }
        else if (command === "runtime") {
            await sock.sendMessage(from, { text: `*🔥 Uptime:* ${runtime(process.uptime())}` });
        }

        // ===== SAVE VIEW ONCE - NEW COMMAND =====
        else if (command === "save") {
            let mediaMessage = isImage? m.message.imageMessage : isVideo? m.message.videoMessage : isQuotedImage? m.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage : isQuotedVideo? m.message.extendedTextMessage.contextInfo.quotedMessage.videoMessage : null;

            if (!mediaMessage) return await sock.sendMessage(from, { text: "*❌ Reply to a ViewOnce/Image/Video with.save*" });

            let msg = await sock.sendMessage(from, { text: "*💾 Saving ViewOnce...*" });
            try {
                const buffer = await downloadMedia(mediaMessage);
                if (mediaMessage.mimetype.includes('image')) {
                    await sock.sendMessage(from, { image: buffer, caption: `*✅ ViewOnce Saved!*\n*👑 ${botName}*` });
                } else if (mediaMessage.mimetype.includes('video')) {
                    await sock.sendMessage(from, { video: buffer, caption: `*✅ ViewOnce Saved!*\n*👑 ${botName}*` });
                }
                await sock.sendMessage(from, { text: "✅ *Saved!*", edit: msg.key });
            } catch (e) {
                console.log(`Save Error: ${e}`);
                await sock.sendMessage(from, { text: `❌ *Failed! Error: ${e.message}*`, edit: msg.key });
            }
        }

        else if (command === "song") {
            if (!q) return await sock.sendMessage(from, { text: '*Usage:* ' + prefix + 'song Believer' });
            let msg = await sock.sendMessage(from, { text: "*🎵 Searching...*" });
            try {
                const search = await yt.search(q);
                const video = search.videos[0];
                if (!video) return await sock.sendMessage(from, { text: "❌ *Song Not Found!*", edit: msg.key });
                await sock.sendMessage(from, { text: '*🎵 Found:* ' + video.title + '\n*⚡ MAX SPEED Downloading...*', edit: msg.key });

                const audioBuffer = await getYTMP3(video.url);

                songCache[sender] = { buffer: audioBuffer, title: video.title, thumb: video.thumbnail, ytUrl: video.url, author: video.author.name };
                const captionText = '*🎵 ' + video.title + '*\n*👤 ' + video.author.name + '*\n*⏱️ ' + video.timestamp + '*\n*⚡ MAX SPEED 128kbps MP3*\n\n*Reply:*\n*1* - Audio with Logo\n*2* - Document';
                await sock.sendMessage(from, {
                    image: { url: video.thumbnail },
                    caption: captionText
                });
                await sock.sendMessage(from, { text: "✅ *Reply 1 or 2*", edit: msg.key });
                setTimeout(() => delete songCache[sender], 300000);
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ *Failed! Make sure yt-dlp + aria2 is installed*", edit: msg.key });
            }
        }

        else if (command === "video") {
            if (!q) return await sock.sendMessage(from, { text: '*Usage:* ' + prefix + 'video Believer' });
            let msg = await sock.sendMessage(from, { text: "*🎬 Searching...*" });
            try {
                const search = await yt.search(q);
                const video = search.videos[0];
                if (!video) return await sock.sendMessage(from, { text: "❌ *Video Not Found!*", edit: msg.key });
                await sock.sendMessage(from, { text: '*🎬 Found:* ' + video.title + '\n*⚡ MAX SPEED 360p...*', edit: msg.key });

                const videoBuffer = await getYTMP4(video.url);

                await sock.sendMessage(from, { video: videoBuffer, caption: `*🎬 ${video.title}*\n*⏱️ ${video.timestamp}*\n*👤 ${video.author.name}*\n*⚡ 360p MAX SPEED*` });
                await sock.sendMessage(from, { text: "✅ *Done!*", edit: msg.key });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ *Failed! Make sure yt-dlp + aria2 is installed*", edit: msg.key });
            }
        }

        // ===== STICKER - FFMPEG 8.1.1 FIXED =====
        else if (command === "sticker" || command === "s") {
            let mediaMessage = isImage? m.message.imageMessage : isQuotedImage? m.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage : null;
            if (!mediaMessage) return await sock.sendMessage(from, { text: "*❌ Reply to an image or send image with caption.sticker*" });

            let msg = await sock.sendMessage(from, { text: "*⏳ Creating Sticker...*" });
            try {
                const buffer = await downloadMedia(mediaMessage);
                const randomId = Math.floor(Math.random() * 10000);
                const tempInput = `./temp_input_${randomId}.jpg`;
                const tempOutput = `./temp_output_${randomId}.webp`;
                fs.writeFileSync(tempInput, buffer);

                // ffmpeg 8.1 syntax - removed -vsync, added -fps_mode
                const ffmpegCmd = `${FFMPEG_PATH} -i "${tempInput}" -vf "scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -vcodec libwebp -lossless 1 -preset default -loop 0 -an -fps_mode passthrough "${tempOutput}"`;
                await execAsync(ffmpegCmd);

                const webpBuffer = fs.readFileSync(tempOutput);
                await sock.sendMessage(from, { sticker: webpBuffer });
                fs.unlinkSync(tempInput);
                fs.unlinkSync(tempOutput);
                await sock.sendMessage(from, { text: "✅ *Sticker Done!*", edit: msg.key });
            } catch (e) {
                console.log(`Sticker Error: ${e}`);
                await sock.sendMessage(from, { text: `❌ *Failed! Error: ${e.message}*`, edit: msg.key });
            }
        }

        else if (command === "tiktok" || command === "tt") {
            if (!q) return await sock.sendMessage(from, { text: `*Usage:* ${prefix}tiktok <link>` });
            let msg = await sock.sendMessage(from, { text: "*⚡ Downloading TikTok...*" });
            try {
                const videoBuffer = await getUniversalVideo(q);
                await sock.sendMessage(from, { video: videoBuffer, caption: `*✅ TikTok No Watermark*\n*👑 ${botName}*` });
                await sock.sendMessage(from, { text: "✅ *Done!*", edit: msg.key });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ *Invalid TikTok Link!*", edit: msg.key });
            }
        }

        else if (command === "fb" || command === "facebook") {
            if (!q) return await sock.sendMessage(from, { text: `*Usage:* ${prefix}fb <link>` });
            let msg = await sock.sendMessage(from, { text: "*⚡ Downloading Facebook...*" });
            try {
                const videoBuffer = await getUniversalVideo(q);
                await sock.sendMessage(from, { video: videoBuffer, caption: `*✅ Facebook Video*\n*👑 ${botName}*` });
                await sock.sendMessage(from, { text: "✅ *Done!*", edit: msg.key });
            } catch (e) {
                console.log(`FB Error: ${e}`);
                await sock.sendMessage(from, { text: "❌ *Invalid Facebook Link!*\n*Try full video link or public post*", edit: msg.key });
            }
        }

        else if (command === "ig" || command === "instagram") {
            if (!q) return await sock.sendMessage(from, { text: `*Usage:* ${prefix}ig <link>` });
            let msg = await sock.sendMessage(from, { text: "*⚡ Downloading Instagram...*" });
            try {
                const videoBuffer = await getUniversalVideo(q);
                await sock.sendMessage(from, { video: videoBuffer, caption: `*✅ Instagram Video*\n*👑 ${botName}*` });
                await sock.sendMessage(from, { text: "✅ *Done!*", edit: msg.key });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ *Invalid Instagram Link!*", edit: msg.key });
            }
        }

        else if (command === "twitter" || command === "x") {
            if (!q) return await sock.sendMessage(from, { text: `*Usage:* ${prefix}twitter <link>` });
            let msg = await sock.sendMessage(from, { text: "*⚡ Downloading Twitter...*" });
            try {
                const videoBuffer = await getUniversalVideo(q);
                await sock.sendMessage(from, { video: videoBuffer, caption: `*✅ Twitter/X Video*\n*👑 ${botName}*` });
                await sock.sendMessage(from, { text: "✅ *Done!*", edit: msg.key });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ *Invalid Twitter Link!*", edit: msg.key });
            }
        }

        else if (command === "mediafire" || command === "mf") {
            if (!q) return await sock.sendMessage(from, { text: `*Usage:* ${prefix}mediafire <link>` });
            let msg = await sock.sendMessage(from, { text: "*⚡ Getting MediaFire...*" });
            try {
                const api = await axios.get(`https://api.rynox.tech/api/mediafire?url=${q}`, { timeout: 30000 });
                await sock.sendMessage(from, { document: { url: api.data.url }, fileName: api.data.filename, mimetype: api.data.mimetype, caption: `*📁 ${api.data.filename}*\n*💾 Size:* ${api.data.size}\n*👑 ${botName}*` });
                await sock.sendMessage(from, { text: "✅ *Done!*", edit: msg.key });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ *Invalid MediaFire Link!*", edit: msg.key });
            }
        }

        else if (command === "gdrive" || command === "drive") {
            if (!q) return await sock.sendMessage(from, { text: `*Usage:* ${prefix}gdrive <link>` });
            let msg = await sock.sendMessage(from, { text: "*⚡ Downloading Google Drive...*" });
            try {
                const api = await axios.get(`https://api.rynox.tech/api/gdrive?url=${q}`, { timeout: 30000 });
                await sock.sendMessage(from, { document: { url: api.data.url }, fileName: api.data.filename, mimetype: api.data.mimetype, caption: `*📁 ${api.data.filename}*\n*💾 Size:* ${api.data.size}\n*👑 ${botName}*` });
                await sock.sendMessage(from, { text: "✅ *Done!*", edit: msg.key });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ *Invalid Google Drive Link!*", edit: msg.key });
            }
        }

        else if (command === "gitclone" || command === "git") {
            if (!q) return await sock.sendMessage(from, { text: `*Usage:* ${prefix}gitclone <repo link>` });
            let msg = await sock.sendMessage(from, { text: "*⚡ Cloning GitHub Repo...*" });
            try {
                let regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/([^\/:]+)/i
                let [, user, repo] = q.match(regex) || []
                if (!user ||!repo) return await sock.sendMessage(from, { text: "❌ *Invalid GitHub Link!*", edit: msg.key });
                repo = repo.replace(/.git$/, '')
                let url = `https://api.github.com/repos/${user}/${repo}/zipball`
                await sock.sendMessage(from, { document: { url: url }, fileName: `${repo}.zip`, mimetype: 'application/zip', caption: `*✅ GitHub Repo*\n*📦 ${user}/${repo}*\n*👑 ${botName}*` });
                await sock.sendMessage(from, { text: "✅ *Done!*", edit: msg.key });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ *Failed! Repo not found*", edit: msg.key });
            }
        }

        else if (command === "apk" || command === "app") {
            if (!q) return await sock.sendMessage(from, { text: `*Usage:* ${prefix}apk WhatsApp` });
            let msg = await sock.sendMessage(from, { text: "*⚡ Searching APK...*" });
            try {
                const api = await axios.get(`https://api.rynox.tech/api/apk?query=${q}`, { timeout: 30000 });
                await sock.sendMessage(from, { document: { url: api.data.url }, fileName: `${api.data.name}.apk`, mimetype: 'application/vnd.android.package-archive', caption: `*📱 ${api.data.name}*\n*📦 Size:* ${api.data.size}\n*🔢 Version:* ${api.data.version}\n*👑 ${botName}*` });
                await sock.sendMessage(from, { text: "✅ *Done!*", edit: msg.key });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ *APK Not Found!*", edit: msg.key });
            }
        }

        else if (command === "yts" || command === "ytsearch") {
            if (!q) return await sock.sendMessage(from, { text: `*Usage:* ${prefix}yts Mr Beast` });
            let msg = await sock.sendMessage(from, { text: "*🔍 Searching YouTube...*" });
            try {
                const search = await yt.search(q);
                let txt = `*🔍 YOUTUBE RESULTS*\n*Query:* ${q}\n\n`;
                search.videos.slice(0, 10).forEach((v, i) => {
                    txt += `*${i + 1}. ${v.title}*\n*📺 ${v.author.name}*\n*⏱️ ${v.timestamp}* | *👁️ ${v.views.toLocaleString()}*\n*🔗 ${v.url}*\n\n`;
                });
                txt += `_Use ${prefix}song <title> to download_`;
                await sock.sendMessage(from, { text: txt });
                await sock.sendMessage(from, { text: "✅ *Done!*", edit: msg.key });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ *Failed!*", edit: msg.key });
            }
        }

        else if (command === "lyrics" || command === "lyric") {
            if (!q) return await sock.sendMessage(from, { text: `*Usage:* ${prefix}lyrics Believer` });
            let msg = await sock.sendMessage(from, { text: "*📝 Searching Lyrics...*" });
            try {
                const api = await axios.get(`https://api.rynox.tech/api/lyrics?query=${q}`, { timeout: 30000 });
                await sock.sendMessage(from, { text: `*🎵 ${api.data.title}*\n*👤 ${api.data.artist}*\n\n${api.data.lyrics}\n\n*👑 ${botName}*` });
                await sock.sendMessage(from, { text: "✅ *Done!*", edit: msg.key });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ *Lyrics Not Found!*", edit: msg.key });
            }
        }

        else {
            await sock.sendMessage(from, { text: `❌ *Command Not Found!*\nType ${prefix}menu for list` });
        }
    });
}

startBot();
