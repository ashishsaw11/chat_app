const socket = io();
const container = document.getElementById('pending');

socket.on('pending-new', ({ chatId, msg }) => {
  const el = document.createElement('div');
el.id = `${chatId}_${msg.id}`;

  el.innerHTML = `
    <b>${msg.from} ➜ ${msg.to}</b>: ${msg.text}
    <button onclick="edit('${chatId}', ${msg.id})">✎</button>
    <button onclick="del('${chatId}', ${msg.id})">🗑</button>
    `;
  container.appendChild(el);
});

function edit(chatId, msgId) {
  const newText = prompt('New text:');
  if (newText) socket.emit('admin-edit', { chatId, msgId, newText });
}

function del(chatId, msgId) {
  if (confirm('Delete?')) socket.emit('admin-delete', { chatId, msgId });
}
