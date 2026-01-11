/**
 * VITATRACK SERVER (Auth & Profile)
 * - Handles Login/Register.
 * - Handles Profile Updates (Weight/Height).
 * - Saves everything to 'database.json'.
 */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(bodyParser.json());

// --- DATABASE HELPER ---
const loadDB = () => {
    try {
        if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE));
    } catch (e) { console.error("DB Load Error", e); }
    return { users: [] }; 
};

const saveDB = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) { console.error("DB Save Error", e); }
};

// Initialize DB if missing
if (!fs.existsSync(DB_FILE)) saveDB({ users: [] });

// --- AUTH ROUTES ---

// 1. REGISTER
app.post('/api/auth/register', (req, res) => {
    const { name, email, password, weight, height } = req.body;
    const db = loadDB(); 

    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ error: "User already exists!" });
    }

    const newUser = { 
        id: Date.now().toString(), 
        name, email, password, weight, height, 
        joined: new Date().toISOString() 
    };

    db.users.push(newUser);
    saveDB(db);
    console.log(`[REGISTER] New User: ${name}`);
    res.json({ message: "Success", user: newUser });
});

// 2. LOGIN
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const db = loadDB();

    const user = db.users.find(u => u.email === email && u.password === password);
    
    if (user) {
        console.log(`[LOGIN] User: ${user.name}`);
        res.json({ message: "Success", user });
    } else {
        res.status(401).json({ error: "Invalid Credentials" });
    }
});

// --- PROFILE ROUTES (Added) ---

// 3. GET PROFILE
app.get('/api/profile/:userId', (req, res) => {
    const db = loadDB();
    const user = db.users.find(u => u.id === req.params.userId);
    
    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ error: "User not found" });
    }
});

// 4. UPDATE PROFILE (Weight, Height, Name)
app.put('/api/profile/:userId', (req, res) => {
    const db = loadDB();
    const index = db.users.findIndex(u => u.id === req.params.userId);
    
    if (index > -1) {
        // Update user data
        db.users[index] = { ...db.users[index], ...req.body };
        saveDB(db);
        console.log(`[UPDATE] Profile updated for: ${db.users[index].name}`);
        res.json({ message: "Profile Updated", user: db.users[index] });
    } else {
        res.status(404).json({ error: "User not found" });
    }
});

// Start Server
app.listen(PORT, () => console.log(`VitaTrack Server Running on http://localhost:${PORT}`));