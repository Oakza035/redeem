const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');
const express = require('express'); // Keep bot alive

const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(3000, () => console.log('Server started to keep bot alive.'));

const SELLER_KEY = process.env.SELLER_KEY;
const ROLE_IDS = [];
for (let i = 1; i <= 50; i++) {
    const key = i < 10 ? `ROLE_0${i}` : `ROLE_${i}`;
    ROLE_IDS.push(process.env[key]);
}
const ROLE_BIG = process.env.ROLE_BIG;
const USED_KEYS_FILE = path.join(__dirname, 'used_keys.json');

let usedKeys = {};
if (fs.existsSync(USED_KEYS_FILE)) {
    usedKeys = JSON.parse(fs.readFileSync(USED_KEYS_FILE, 'utf8'));
}

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessageReactions, 
        GatewayIntentBits.GuildMembers
    ] 
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId === 'verify_key') {
        const modal = new ModalBuilder()
            .setCustomId('key_verification')
            .setTitle('Key Verification');

        const keyInput = new TextInputBuilder()
            .setCustomId('license_key')
            .setLabel('Enter your License Key')
            .setStyle(TextInputStyle.Short);

        modal.addComponents(new ActionRowBuilder().addComponents(keyInput));
        await interaction.showModal(modal);
    } else if (interaction.isModalSubmit() && interaction.customId === 'key_verification') {
        const licenseKey = interaction.fields.getTextInputValue('license_key');
        
        if (usedKeys[licenseKey]) {
            return await interaction.reply({ content: '❌ คีย์นี้ถูกใช้ไปแล้ว.', ephemeral: true });
        }

        const apiUrl = `https://keyauth.win/api/seller/?sellerkey=${SELLER_KEY}&type=info&key=${licenseKey}`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data && data.success) {
                let replyMessage = `✅ ตรวจสอบ key สำเร็จคุณได้รับยศ!`;
                
                if (data.level && data.level >= 1 && data.level <= 50) {
                    const guild = interaction.guild;
                    const member = await guild.members.fetch(interaction.user.id);

                    const roleId = ROLE_IDS[data.level - 1];
                    const levelRole = roleId ? guild.roles.cache.get(roleId) : null;

                    if (levelRole && member) {
                        await member.roles.add(levelRole);
                        if (ROLE_BIG) {
                            const bigRole = guild.roles.cache.get(ROLE_BIG);
                            if (bigRole && !member.roles.cache.has(bigRole.id)) {
                                await member.roles.add(bigRole);
                            }
                        }
                    }
                }
                
                usedKeys[licenseKey] = true;
                fs.writeFileSync(USED_KEYS_FILE, JSON.stringify(usedKeys, null, 2));
                
                await interaction.reply({ content: replyMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: `❌ Invalid Key!`, ephemeral: true });
            }
        } catch (error) {
            await interaction.reply({ content: '❌ ไม่สามารถตรวจสอบรหัสได้ โปรดลองอีกครั้งในภายหลัง', ephemeral: true });
        }
    }
});

client.on('messageCreate', async message => {
    if (message.content === '!verify') {
        const adminUids = process.env.ADMIN_UIDS ? process.env.ADMIN_UIDS.split(',') : [];
        if (!adminUids.includes(message.author.id)) {
            return message.reply('❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้!');
        }
        
        const embed = new EmbedBuilder()
            .setTitle('REDEEM KEY PRODUCT SPEED FRAM | WHYIWIN SHOP')
            .setDescription('**วิธีใช้งานบอท**\n1. เว็บไซต์ : https://whyiwin.xyz/\n2. นำโค้ดที่ได้มาเติมกับบอท\n\n🚫 **สำคัญ** : กรอกคีย์ได้เพียงครั้งเดียว โปรดตรวจสอบให้แน่ใจก่อนดำเนินการ')
            .setImage('https://img5.pic.in.th/file/secure-sv1/download-1227d68ce742652d5.jpg')
            .setColor('#5865F2')
            .setFooter({ text: 'Powered by Dr.WHYiWIN' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_key')
                    .setLabel('Redeem Code')
                    .setStyle(ButtonStyle.Primary)
            );

        await message.reply({ embeds: [embed], components: [row] });
    }
});

client.login(process.env.TOKEN);
