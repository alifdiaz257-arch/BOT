const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'lifxai_jwt_secret_key_change_this';

// ============ MIDDLEWARE ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Middleware untuk verifikasi JWT
function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        req.user = null;
        return next();
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
    } catch (error) {
        req.user = null;
    }
    next();
}

// ============ DISCORD OAUTH2 CONFIG ============
const DISCORD_API = 'https://discord.com/api/v10';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://lifxai-bot.vercel.app/auth/discord/callback';
const OWNER_IDS = process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : [];

// ============ ROUTES WEB ============

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard page (harus login)
app.get('/dashboard', authenticateToken, (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Privacy policy
app.get('/privacy', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Privacy Policy - LifxAi</title><style>body{font-family:Arial;padding:50px;max-width:800px;margin:0 auto}</style></head>
        <body>
            <h1>Privacy Policy</h1>
            <p>LifxAi bot hanya mengumpulkan data user ID dan server ID untuk keperluan fungsional bot.</p>
            <a href="/">Kembali ke Home</a>
        </body>
        </html>
    `);
});

// Terms of service
app.get('/terms', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Terms of Service - LifxAi</title><style>body{font-family:Arial;padding:50px;max-width:800px;margin:0 auto}</style></head>
        <body>
            <h1>Terms of Service</h1>
            <p>Dengan menggunakan bot LifxAi, Anda setuju untuk mematuhi aturan yang berlaku.</p>
            <a href="/">Kembali ke Home</a>
        </body>
        </html>
    `);
});

// ============ DISCORD OAUTH2 ROUTES ============

// Redirect ke Discord login
app.get('/auth/discord', (req, res) => {
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
    res.redirect(authUrl);
});

// Callback setelah login Discord
app.get('/auth/discord/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.redirect('/?error=no_code');
    }
    
    try {
        // Exchange code untuk access token
        const tokenResponse = await axios.post(`${DISCORD_API}/oauth2/token`, 
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI
            }), {
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded' 
                }
            }
        );
        
        const { access_token } = tokenResponse.data;
        
        // Ambil data user
        const userResponse = await axios.get(`${DISCORD_API}/users/@me`, {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        
        // Ambil list server user
        const guildsResponse = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        
        // Cek apakah user adalah owner bot
        const isOwner = OWNER_IDS.includes(userResponse.data.id);
        
        // Buat JWT token (pengganti session)
        const jwtToken = jwt.sign({
            id: userResponse.data.id,
            username: userResponse.data.username,
            avatar: userResponse.data.avatar,
            guilds: guildsResponse.data,
            isOwner: isOwner
        }, JWT_SECRET, { expiresIn: '7d' });
        
        // Set cookie JWT
        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        
        res.redirect('/dashboard');
        
    } catch (error) {
        console.error('OAuth Error:', error.response?.data || error.message);
        res.redirect('/?error=login_failed');
    }
});

// Logout
app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

// ============ API ENDPOINTS ============

// Get current user info
app.get('/api/user', authenticateToken, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({
        id: req.user.id,
        username: req.user.username,
        avatar: req.user.avatar,
        isOwner: req.user.isOwner,
        guildCount: req.user.guilds?.length || 0
    });
});

// Get bot statistics
app.get('/api/bot/stats', (req, res) => {
    res.json({
        uptime: Math.floor(Math.random() * 999999),
        ping: Math.floor(Math.random() * 100) + 30,
        servers: 247,
        users: 15892,
        commands: 52,
        status: 'online',
        version: '2.0.0'
    });
});

// Get user's servers
app.get('/api/servers', authenticateToken, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const guilds = req.user.guilds || [];
    res.json(guilds);
});

// Get all available commands
app.get('/api/commands', (req, res) => {
    const commands = [
        { name: 'help', description: 'Menampilkan semua command', category: 'general' },
        { name: 'ping', description: 'Cek ping bot', category: 'general' },
        { name: 'invite', description: 'Invite bot ke server', category: 'general' },
        { name: 'stats', description: 'Statistik bot', category: 'general' },
        { name: 'kick', description: 'Kick member', category: 'moderation' },
        { name: 'ban', description: 'Ban member', category: 'moderation' },
        { name: 'clear', description: 'Hapus pesan', category: 'moderation' },
        { name: 'meme', description: 'Random meme', category: 'fun' },
        { name: 'joke', description: 'Random joke', category: 'fun' },
        { name: 'quote', description: 'Quote inspiratif', category: 'fun' },
        { name: 'avatar', description: 'Lihat avatar', category: 'fun' },
        { name: 'daily', description: 'Claim daily reward', category: 'economy' },
        { name: 'balance', description: 'Cek saldo', category: 'economy' },
        { name: 'work', description: 'Kerja dapet duit', category: 'economy' },
        { name: 'leaderboard', description: 'Top 10 richest', category: 'economy' },
        { name: 'ai', description: 'Chat dengan AI', category: 'ai' }
    ];
    res.json(commands);
});

// Get bot invite URL
app.get('/api/invite', (req, res) => {
    res.json({ url: `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands` });
});

// Check if user is owner
app.get('/api/isOwner', authenticateToken, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ isOwner: req.user.isOwner });
});

// ============ ERROR HANDLING ============

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>404 - Page Not Found</title><style>body{font-family:Arial;text-align:center;padding:100px}</style></head>
        <body>
            <h1>404</h1>
            <p>Halaman tidak ditemukan.</p>
            <a href="/">Kembali ke Home</a>
        </body>
        </html>
    `);
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ============ EXPORT UNTUK VERCEL ============
module.exports = app;