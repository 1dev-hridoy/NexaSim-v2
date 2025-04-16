const config = require('../../config/config.json');
const logger = require('../../includes/logger');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ====== CONFIG ZONE ======
const FB_COVER_API_URL = 'https://nexalo-api.vercel.app/api/fb-cover';
const ACCESS_TOKEN = '6628568379|c1e620fa708a1d5696fb991c1bde5662'; 
// ==========================

module.exports = {
    name: "cover1",
    version: "1.0.1",
    author: "Hridoy",
    description: "Generate a Facebook cover image with your name and profile picture 🎨",
    adminOnly: false,
    commandCategory: "Fun",
    guide: "Use {pn}cover1 <FirstName> <LastName> to create a cover with your profile picture.\n" +
           "Or use {pn}cover1 @username <FirstName> <LastName> to use the mentioned user's profile picture.\n" +
           "Example: {pn}cover1 John Doe\n" +
           "Example: {pn}cover1 @username John Doe",
    cooldowns: 5,
    usePrefix: true,

    async execute({ api, event, args }) {
        const threadID = event.threadID;
        const messageID = event.messageID;

        let filePath;

        try {
            if (!event || !threadID || !messageID) {
                return api.sendMessage(`${config.bot.botName}: ❌ Invalid event data.`, threadID);
            }

            if (args.length < 2) {
                return api.sendMessage(
                    `${config.bot.botName}: Please provide a first name and last name. Example: {pn}cover1 John Doe`,
                    threadID,
                    messageID
                );
            }

            let imageUserID = event.senderID;
            let firstName, lastName;

            if (args[0].startsWith('@')) {
                if (args.length < 3) {
                    return api.sendMessage(
                        `${config.bot.botName}: Please provide a first name and last name after the mention. Example: {pn}cover1 @username John Doe`,
                        threadID,
                        messageID
                    );
                }

                const mention = event.mentions;
                if (!mention || Object.keys(mention).length === 0) {
                    throw new Error("No user mentioned or mention format is incorrect");
                }

                imageUserID = Object.keys(mention)[0];
                firstName = args[1];
                lastName = args.slice(2).join(" ");
            } else {
                firstName = args[0];
                lastName = args.slice(1).join(" ");
            }

            if (!firstName || !lastName) {
                return api.sendMessage(
                    `${config.bot.botName}: Please provide both a first name and last name. Example: {pn}cover1 John Doe`,
                    threadID,
                    messageID
                );
            }

            const imageUrl = `https://graph.facebook.com/${imageUserID}/picture?width=512&height=512&access_token=${ACCESS_TOKEN}`;
            const apiUrl = `${FB_COVER_API_URL}?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}&imageUrl=${encodeURIComponent(imageUrl)}`;

            const coverResponse = await axios.get(apiUrl, { timeout: 30000, responseType: 'stream' });

            const tempDir = path.join(__dirname, '..', '..', 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const fileName = `cover1_${crypto.randomBytes(8).toString('hex')}.png`;
            filePath = path.join(tempDir, fileName);

            const writer = fs.createWriteStream(filePath);
            coverResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const msg = {
                body: `${config.bot.botName}: 🎨 Here's your Facebook cover for "${firstName} ${lastName}"!`,
                attachment: fs.createReadStream(filePath)
            };

            await api.sendMessage(msg, threadID);

            fs.unlinkSync(filePath);
        } catch (err) {
            await api.sendMessage(
                `${config.bot.botName}: ⚠️ Error: ${err.message}`,
                threadID,
                messageID
            );

            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }
};