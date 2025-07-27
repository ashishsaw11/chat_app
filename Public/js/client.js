const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const toUser = urlParams.get('to');
document.getElementById('toUser').textContent = toUser;

socket.on('chat-message', msg => {
  const el = document.createElement('div');
el.textContent = `${msg.from}: ${msg.text}`;

  document.getElementById('messages').appendChild(el);
});

function send() {
  const input = document.getElementById('msg');
  socket.emit('send-message', { toUser, text: input.value });
  input.value = '';
}

