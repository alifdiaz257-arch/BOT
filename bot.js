const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes, Collection } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ]
});

// Owner IDs dari env
const OWNER_IDS = process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : [];
const isOwner = (userId) => OWNER_IDS.includes(userId);

// ============ COMMANDS COLLECTION ============
client.commands = new Collection();
client.slashCommands = new Collection();

// ============ READY EVENT ============
client.once('ready', async () => {
    console.log(`✅ Bot online sebagai ${client.user.tag}`);
    console.log(`👑 Owner ID: ${OWNER_IDS.join(', ')}`);
    
    client.user.setPresence({
        activities: [{ name: '/help | LifxAi Bot', type: 3 }],
        status: 'online'
    });
    
    await registerSlashCommands();
});

// ============ SLASH COMMANDS REGISTER ============
const commands = [
    new SlashCommandBuilder().setName('help').setDescription('Menampilkan semua command bot'),
    new SlashCommandBuilder().setName('menu').setDescription('Menu utama bot'),
    new SlashCommandBuilder().setName('ping').setDescription('Cek ping bot'),
    new SlashCommandBuilder().setName('invite').setDescription('Invite bot ke server lo'),
    new SlashCommandBuilder().setName('support').setDescription('Link support server'),
    new SlashCommandBuilder().setName('stats').setDescription('Statistik bot'),
    // Moderation (hanya untuk admin server)
    new SlashCommandBuilder().setName('kick').setDescription('Kick member').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)),
    new SlashCommandBuilder().setName('ban').setDescription('Ban member').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('Hapus pesan').addIntegerOption(opt => opt.setName('amount').setDescription('Jumlah').setRequired(true)),
    new SlashCommandBuilder().setName('warn').setDescription('Warning member').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)),
    // Fun
    new SlashCommandBuilder().setName('meme').setDescription('Random meme'),
    new SlashCommandBuilder().setName('joke').setDescription('Random joke lucu'),
    new SlashCommandBuilder().setName('quote').setDescription('Quote inspiratif'),
    new SlashCommandBuilder().setName('avatar').setDescription('Lihat avatar user').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(false)),
    new SlashCommandBuilder().setName('serverinfo').setDescription('Info server'),
    new SlashCommandBuilder().setName('userinfo').setDescription('Info user').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(false)),
    // Economy (public)
    new SlashCommandBuilder().setName('daily').setDescription('Claim daily reward'),
    new SlashCommandBuilder().setName('balance').setDescription('Cek saldo lo'),
    new SlashCommandBuilder().setName('work').setDescription('Kerja dapet duit'),
    new SlashCommandBuilder().setName('leaderboard').setDescription('Top 10 richest'),
    // AI (public)
    new SlashCommandBuilder().setName('ai').setDescription('Chat sama AI').addStringOption(opt => opt.setName('prompt').setDescription('Pertanyaan').setRequired(true)),
    // Owner only commands
    new SlashCommandBuilder().setName('eval').setDescription('Execute code (Owner only)').addStringOption(opt => opt.setName('code').setDescription('Code').setRequired(true)),
    new SlashCommandBuilder().setName('broadcast').setDescription('Broadcast ke semua server (Owner only)').addStringOption(opt => opt.setName('message').setDescription('Pesan').setRequired(true)),
    new SlashCommandBuilder().setName('servers').setDescription('Lihat semua server (Owner only)')
];

async function registerSlashCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands.map(cmd => cmd.toJSON()) });
        console.log(`✅ Registered ${commands.length} slash commands`);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// ============ ECONOMY SYSTEM ============
const economy = new Map();

function getBalance(userId) {
    return economy.get(userId) || { coins: 1000, lastDaily: 0 };
}

function addCoins(userId, amount) {
    const data = getBalance(userId);
    data.coins += amount;
    economy.set(userId, data);
    return data.coins;
}

// ============ WARNING SYSTEM ============
const warnings = new Map();

// ============ SLASH COMMAND HANDLER ============
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    const { commandName, user, channel, guild, options, member } = interaction;
    
    // ===== HELP (PUBLIC) =====
    if (commandName === 'help' || commandName === 'menu') {
        const embed = new EmbedBuilder()
            .setTitle('💙 LIFX AI BOT — PUBLIC EDITION 💙')
            .setDescription(`
**📌 GENERAL COMMANDS**
\`/help\` - Menu bantuan
\`/ping\` - Cek ping bot
\`/invite\` - Invite bot ke server lo
\`/support\` - Support server
\`/stats\` - Statistik bot

**🎮 FUN COMMANDS**
\`/meme\` - Random meme
\`/joke\` - Random joke
\`/quote\` - Quote inspiratif
\`/avatar\` - Lihat avatar
\`/serverinfo\` - Info server
\`/userinfo\` - Info user

**💰 ECONOMY COMMANDS**
\`/daily\` - Claim daily reward
\`/balance\` - Cek saldo
\`/work\` - Kerja dapet duit
\`/leaderboard\` - Top 10 terkaya

**🤖 AI COMMANDS**
\`/ai\` - Chat dengan AI

**🔧 MOD COMMANDS** *(Admin only)*
\`/kick\`, \`/ban\`, \`/clear\`, \`/warn\`

**👑 OWNER COMMANDS** *(Khusus pembuat bot)*
\`/eval\`, \`/broadcast\`, \`/servers\`
            `)
            .setColor('#3B82F6')
            .setFooter({ text: `Request by ${user.username} | Bot by LifxAi` });
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('🌐 Website').setStyle(ButtonStyle.Link).setURL('https://lifxai-bot.vercel.app'),
            new ButtonBuilder().setLabel('💬 Support').setStyle(ButtonStyle.Link).setURL('https://discord.gg/invite'),
            new ButtonBuilder().setLabel('➕ Invite Bot').setStyle(ButtonStyle.Link).setURL(`https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`)
        );
        
        await interaction.reply({ embeds: [embed], components: [row] });
    }
    
    // ===== PING =====
    if (commandName === 'ping') {
        await interaction.reply(`🏓 Pong! ${client.ws.ping}ms`);
    }
    
    // ===== INVITE =====
    if (commandName === 'invite') {
        await interaction.reply(`🔗 **Invite Bot ke Server lo:**\nhttps://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`);
    }
    
    // ===== SUPPORT =====
    if (commandName === 'support') {
        await interaction.reply('💬 **Support Server:** https://discord.gg/invite\n📧 **Email:** support@lifxai.com');
    }
    
    // ===== STATS =====
    if (commandName === 'stats') {
        const embed = new EmbedBuilder()
            .setTitle('📊 BOT STATISTICS')
            .setColor('#3B82F6')
            .addFields(
                { name: '🟢 Servers', value: `${client.guilds.cache.size}`, inline: true },
                { name: '👥 Users', value: `${client.users.cache.size}`, inline: true },
                { name: '⚡ Ping', value: `${client.ws.ping}ms`, inline: true },
                { name: '📅 Uptime', value: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`, inline: true },
                { name: '🎮 Commands', value: `${commands.length}`, inline: true },
                { name: '👑 Owner', value: `<@${OWNER_IDS[0]}>`, inline: true }
            );
        await interaction.reply({ embeds: [embed] });
    }
    
    // ===== KICK (Admin only) =====
    if (commandName === 'kick') {
        if (!member.permissions.has('KickMembers')) {
            return interaction.reply({ content: '❌ Lo gak punya permission kick!', ephemeral: true });
        }
        const target = options.getMember('user');
        if (!target) return interaction.reply({ content: '❌ User gak ditemukan!', ephemeral: true });
        await target.kick();
        await interaction.reply(`✅ ${target.user.tag} di-kick dari server!`);
    }
    
    // ===== BAN (Admin only) =====
    if (commandName === 'ban') {
        if (!member.permissions.has('BanMembers')) {
            return interaction.reply({ content: '❌ Lo gak punya permission ban!', ephemeral: true });
        }
        const target = options.getMember('user');
        if (!target) return interaction.reply({ content: '❌ User gak ditemukan!', ephemeral: true });
        await target.ban();
        await interaction.reply(`✅ ${target.user.tag} di-ban dari server!`);
    }
    
    // ===== CLEAR (Admin only) =====
    if (commandName === 'clear') {
        if (!member.permissions.has('ManageMessages')) {
            return interaction.reply({ content: '❌ Lo gak punya permission manage messages!', ephemeral: true });
        }
        const amount = options.getInteger('amount');
        await channel.bulkDelete(Math.min(amount, 100));
        await interaction.reply({ content: `✅ ${amount} pesan dihapus!`, ephemeral: true });
    }
    
    // ===== WARN (Admin only) =====
    if (commandName === 'warn') {
        if (!member.permissions.has('ModerateMembers')) {
            return interaction.reply({ content: '❌ Lo gak punya permission warn!', ephemeral: true });
        }
        const target = options.getUser('user');
        let userWarns = warnings.get(target.id) || [];
        userWarns.push({ reason: 'No reason', mod: user.id, date: new Date() });
        warnings.set(target.id, userWarns);
        await interaction.reply(`⚠️ ${target.username} di-warning! Total warns: ${userWarns.length}`);
    }
    
    // ===== MEME =====
    if (commandName === 'meme') {
        const memes = [
            'https://i.imgflip.com/1bij.jpg',
            'https://i.imgflip.com/26am.jpg',
            'https://i.imgflip.com/43a4p.jpg',
            'https://i.imgflip.com/5iww3.jpg'
        ];
        await interaction.reply(memes[Math.floor(Math.random() * memes.length)]);
    }
    
    // ===== JOKE =====
    if (commandName === 'joke') {
        const jokes = [
            'Kenapa ayam nyeberang jalan? Biar sampai ke seberang!',
            'Programmer mana yang suka main game? Yang lagi debug!',
            'Kalo kamu jadi API, aku mau jadi request biar selalu nyambung ke kamu 💙'
        ];
        await interaction.reply(jokes[Math.floor(Math.random() * jokes.length)]);
    }
    
    // ===== QUOTE =====
    if (commandName === 'quote') {
        const quotes = [
            '✨ Jangan takut gagal, takutlah untuk tidak mencoba ✨',
            '💪 Kecil itu bukan masalah, yang penting konsisten 💪',
            '🔥 Kesuksesan dimulai dari mimpi, mimpi dimulai dari lo 🔥'
        ];
        await interaction.reply(quotes[Math.floor(Math.random() * quotes.length)]);
    }
    
    // ===== AVATAR =====
    if (commandName === 'avatar') {
        const target = options.getUser('user') || user;
        await interaction.reply(target.displayAvatarURL({ size: 1024, dynamic: true }));
    }
    
    // ===== SERVER INFO =====
    if (commandName === 'serverinfo') {
        const embed = new EmbedBuilder()
            .setTitle(guild.name)
            .setThumbnail(guild.iconURL())
            .setColor('#3B82F6')
            .addFields(
                { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
                { name: '💬 Channels', value: `${guild.channels.cache.size}`, inline: true }
            );
        await interaction.reply({ embeds: [embed] });
    }
    
    // ===== USER INFO =====
    if (commandName === 'userinfo') {
        const target = options.getUser('user') || user;
        const embed = new EmbedBuilder()
            .setTitle(target.username)
            .setThumbnail(target.displayAvatarURL())
            .setColor('#3B82F6')
            .addFields(
                { name: '🆔 ID', value: target.id, inline: true },
                { name: '📅 Joined Discord', value: target.createdAt.toLocaleDateString(), inline: true }
            );
        await interaction.reply({ embeds: [embed] });
    }
    
    // ===== DAILY =====
    if (commandName === 'daily') {
        const data = getBalance(user.id);
        const now = Date.now();
        const lastDaily = data.lastDaily || 0;
        
        if (now - lastDaily < 86400000) {
            const hoursLeft = Math.ceil((86400000 - (now - lastDaily)) / 3600000);
            return interaction.reply({ content: `⏰ Daily reward bisa diambil lagi dalam ${hoursLeft} jam!`, ephemeral: true });
        }
        
        const reward = 500;
        data.coins += reward;
        data.lastDaily = now;
        economy.set(user.id, data);
        await interaction.reply(`🎉 Daily reward **${reward} coins** berhasil diambil! Balance: **${data.coins} coins**`);
    }
    
    // ===== BALANCE =====
    if (commandName === 'balance') {
        const data = getBalance(user.id);
        await interaction.reply(`💰 **${user.username}**\nCoins: ${data.coins} 🪙`);
    }
    
    // ===== WORK =====
    if (commandName === 'work') {
        const jobs = ['💻 Programmer', '🍕 Pizza Delivery', '📦 Kurir', '🧹 Cleaning Service'];
        const job = jobs[Math.floor(Math.random() * jobs.length)];
        const reward = Math.floor(Math.random() * 200) + 50;
        addCoins(user.id, reward);
        await interaction.reply(`💼 Kerja sebagai **${job}** dapet **${reward} coins**!`);
    }
    
    // ===== LEADERBOARD =====
    if (commandName === 'leaderboard') {
        const sorted = [...economy.entries()].sort((a, b) => b[1].coins - a[1].coins).slice(0, 10);
        let text = '🏆 **TOP 10 RICHEST** 🏆\n\n';
        
        for (let i = 0; i < sorted.length; i++) {
            const [userId, data] = sorted[i];
            try {
                const userObj = await client.users.fetch(userId);
                text += `${i+1}. ${userObj.username} — ${data.coins} coins\n`;
            } catch {
                text += `${i+1}. Unknown — ${data.coins} coins\n`;
            }
        }
        await interaction.reply(text);
    }
    
    // ===== AI =====
    if (commandName === 'ai') {
        const prompt = options.getString('prompt');
        await interaction.reply(`🤖 *Processing...*`);
        
        const responses = [
            `💙 **LifxAi:** Wah pertanyaan bagus tuan! Menurut AI, "${prompt}" itu jawabannya adalah cinta dan kebaikan ✨`,
            `💙 **LifxAi:** ${prompt}? Keren banget pertanyaannya. Teruslah bertanya dan belajar! 🔥`,
            `💙 **LifxAi:** Berdasarkan database LifxAi, jawaban dari "${prompt}" adalah: Jadilah versi terbaik dari dirimu sendiri 💪`
        ];
        
        setTimeout(() => interaction.editReply(responses[Math.floor(Math.random() * responses.length)]), 1500);
    }
    
    // ===== OWNER ONLY COMMANDS =====
    if (commandName === 'eval' && isOwner(user.id)) {
        const code = options.getString('code');
        try {
            let evaled = eval(code);
            if (typeof evaled !== 'string') evaled = require('util').inspect(evaled);
            await interaction.reply(`\`\`\`js\n${evaled.slice(0, 1900)}\n\`\`\``);
        } catch (err) {
            await interaction.reply(`\`\`\`js\n${err}\n\`\`\``);
        }
    }
    
    if (commandName === 'broadcast' && isOwner(user.id)) {
        const message = options.getString('message');
        let sent = 0;
        for (const guild of client.guilds.cache.values()) {
            const systemChannel = guild.systemChannel;
            if (systemChannel) {
                try {
                    await systemChannel.send(`📢 **Announcement from Bot Owner:**\n${message}`);
                    sent++;
                } catch(e) {}
            }
        }
        await interaction.reply(`✅ Broadcast terkirim ke ${sent} server!`);
    }
    
    if (commandName === 'servers' && isOwner(user.id)) {
        let list = '**📋 Daftar Server:**\n\n';
        client.guilds.cache.forEach(guild => {
            list += `• ${guild.name} (${guild.memberCount} members)\n`;
        });
        await interaction.reply(list.slice(0, 2000));
    }
    
    if ((commandName === 'eval' || commandName === 'broadcast' || commandName === 'servers') && !isOwner(user.id)) {
        await interaction.reply({ content: '❌ Command ini cuma bisa dipake oleh owner bot!', ephemeral: true });
    }
});

// ============ MESSAGE PREFIX COMMANDS (Public) ============
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const prefix = '!';
    if (!message.content.startsWith(prefix)) return;
    
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    if (command === 'ping') {
        await message.reply(`🏓 Pong! ${client.ws.ping}ms`);
    }
    
    if (command === 'help') {
        await message.reply('📚 **Command List:** `!ping`, `!invite`, `!stats`\nAtau ketik `/help` untuk menu lengkap!');
    }
    
    if (command === 'invite') {
        await message.reply(`🔗 **Invite Bot:** https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`);
    }
    
    if (command === 'stats') {
        await message.reply(`📊 **Stats:** Servers: ${client.guilds.cache.size} | Users: ${client.users.cache.size} | Ping: ${client.ws.ping}ms`);
    }
});

client.login(process.env.DISCORD_TOKEN);