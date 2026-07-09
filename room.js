const ROOM_ID = new URLSearchParams(window.location.search).get('room');
document.getElementById('roomId').innerText = ROOM_ID;

let localStream;
let peer;
let connections = {};

async function init() {
  localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
  document.getElementById('localVideo').srcObject = localStream;

  peer = new Peer(ROOM_ID + '-' + Math.random().toString(36).substr(2,9), {
    host: '0.peerjs.com', port: 443, path: '/'
  });

  peer.on('open', () => setTimeout(connectToRoom, 2000));

  peer.on('connection', conn => {
    connections[conn.peer] = conn;
    conn.on('data', data => addMessage("Friend", data));
  });

  peer.on('call', call => {
    call.answer(localStream);
    call.on('stream', s => document.getElementById('remoteVideo').srcObject = s);
  });
}

function connectToRoom() {
  const conn = peer.connect(ROOM_ID);
  conn.on('open', () => {
    connections[ROOM_ID] = conn;
    conn.on('data', d => addMessage("Friend", d));
    const call = peer.call(ROOM_ID, localStream);
    if(call) call.on('stream', s => document.getElementById('remoteVideo').srcObject = s);
  });
}

function toggleChat() {
  const chat = document.getElementById('chatPanel');
  chat.style.display = chat.style.display === 'flex'? 'none' : 'flex';
  document.getElementById('controls').style.display = chat.style.display === 'flex'? 'none' : 'flex';
}

function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if(msg === '') return;
  Object.values(connections).forEach(c => c.open && c.send(msg));
  addMessage("You", msg);
  input.value = '';
}

function addMessage(sender, text) {
  document.getElementById('chatMessages').innerHTML += `<div class="msg"><b>${sender}:</b> ${text}</div>`;
}

document.getElementById('chatInput').addEventListener('focus', () => {
  document.getElementById('controls').style.bottom = '300px';
});
document.getElementById('chatInput').addEventListener('blur', () => {
  document.getElementById('controls').style.bottom = '20px';
});

function toggleMic() { localStream.getAudioTracks()[0].enabled =!localStream.getAudioTracks()[0].enabled; document.getElementById('micBtn').classList.toggle('active'); }
function toggleCam() { localStream.getVideoTracks()[0].enabled =!localStream.getVideoTracks()[0].enabled; document.getElementById('camBtn').classList.toggle('active'); }
function leave() { window.location.href = 'index.html'; }
function copyRoom() { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }

init();
