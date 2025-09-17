const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
}); 

const app = express();

app.use(cors());
app.use(express.json());

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.sendStatus(401);
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'register.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'register.html'));
});
app.get('/tasks', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ msg: 'Missing username or password' });
    }

    try {
        console.log("Testing 1");
        const existingUser = await pool.query('SELECT * FROM "User" WHERE username = $1', [username]);
        console.log("Testing 2");
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ msg: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUserResult = await pool.query(
            'INSERT INTO "User" (username, "passwordHash") VALUES ($1, $2) RETURNING id, username',
            [username, hashedPassword]
        );
        res.status(201).json(newUserResult.rows[0]);
    } catch (error) {
        console.log(process.env.DATABASE_URL);
        console.error(error);
        res.status(500).json({ msg: 'Server error during registration' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const result = await pool.query('SELECT * FROM "User" WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ msg: 'Incorrect username or password' });
        }
        
        const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ access_token: accessToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error during login' });
    }
});

app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM "Todo" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
            [req.user.userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Failed to retrieve tasks' });
    }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Task text required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO "Todo" (text, "userId") VALUES ($1, $2) RETURNING *',
            [text, req.user.userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Failed to create task' });
    }
});

app.patch('/api/tasks/:id', authenticateToken, async (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const { text, completed } = req.body;

    try {
        const taskResult = await pool.query('SELECT * FROM "Todo" WHERE id = $1 AND "userId" = $2', [taskId, req.user.userId]);
        if (taskResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Task not found or you do not have permission' });
        }
        
        const updatedResult = await pool.query(
            'UPDATE "Todo" SET text = $1, completed = $2 WHERE id = $3 RETURNING *',
            [
                text !== undefined ? text : taskResult.rows[0].text,
                completed !== undefined ? completed : taskResult.rows[0].completed,
                taskId
            ]
        );
        res.json(updatedResult.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Failed to update task' });
    }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    
    try {
        const taskResult = await pool.query('SELECT * FROM "Todo" WHERE id = $1 AND "userId" = $2', [taskId, req.user.userId]);
        if (taskResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Task not found or you do not have permission' });
        }

        await pool.query('DELETE FROM "Todo" WHERE id = $1', [taskId]);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Failed to delete task' });
    }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;