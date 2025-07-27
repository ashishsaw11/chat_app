
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const sharedSession = require('express-socket.io-session');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

const sessionMiddleware = session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
});

app.use(sessionMiddleware);
io.use(sharedSession(sessionMiddleware));

// In-memory stores
const users = {};
const pending = {};

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (users[username]) return res.redirect('/register.html?error=exists');

  const passwordHash = await bcrypt.hash(password, 10);
  users[username] = { passwordHash, socketId: null };
  res.redirect('/login.html?success=registered');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users[username];

  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return res.redirect('/login.html?error=invalid');
  }

  req.session.user = username;
  res.redirect('/search.html');
});

app.get('/api/search', (req, res) => {
  const q = req.query.q?.toLowerCase();
  const me = req.session.user;
  if (!q || !me) return res.json([]);

  const results = Object.keys(users)
    .filter(u => u !== me && u.toLowerCase().includes(q))
    .slice(0, 10);
  res.json(results);
});

io.on('connection', socket => {
  const me = socket.handshake.session.user;
  if (!me) return;

  users[me].socketId = socket.id;
  if (me === 'admin') socket.join('admins');

  socket.on('send-message', ({ toUser, text }) => {
    const chatId = [me, toUser].sort().join(':');
    const msg = { id: Date.now(), from: me, to: toUser, text };

    if (!pending[chatId]) pending[chatId] = [];
    msg.timer = setTimeout(() => {
      io.to(users[toUser].socketId).emit('chat-message', msg);
      pending[chatId] = pending[chatId].filter(m => m.id !== msg.id);
    }, 30000);

    pending[chatId].push(msg);
    io.to('admins').emit('pending-new', { chatId, msg });
  });

  socket.on('admin-edit', ({ chatId, msgId, newText }) => {
    const queue = pending[chatId] || [];
    const msg = queue.find(m => m.id === msgId);
    if (!msg) return;

    clearTimeout(msg.timer);
    msg.text = newText;
    io.to(users[msg.to].socketId).emit('chat-message', msg);
    pending[chatId] = queue.filter(m => m.id !== msgId);
  });

  socket.on('admin-delete', ({ chatId, msgId }) => {
    const queue = pending[chatId] || [];
    const msg = queue.find(m => m.id === msgId);
    if (!msg) return;

    clearTimeout(msg.timer);
    pending[chatId] = queue.filter(m => m.id !== msgId);
  });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));

