const ROOM_ID = new URLSearchParams(window.location.search).get('room');
document.getElementById('roomId').innerText = ROOM_ID;

let localStream;
let peer;
let conn;

async function init() {
  localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
  document.getElementById('localVideo').srcObject = localStream;

  peer = new Peer(ROOM_ID + '-' + Math.random().toString(36).substr(2,5), {
    host: '0.peerjs.com', port: 443, path: '/'
  });

  peer.on('open', id => {
    // After 1s, try to connect to anyone else in the room
    setTimeout(() => {
      conn = peer.connect(ROOM_ID, { reliable: true, metadata: {room: ROOM_ID} });
      if(conn) setupConn(conn);
    }, 1000);
  });

  // If someone connects to us
  peer.on('connection', c => {
    if(c.metadata?.room === ROOM_ID) setupConn(c);
  });

  peer.on('call', call => {
    call.answer(localStream);
    call.on('stream', s => document.getElementById('remoteVideo').srcObject = s);
  });
}

function setupConn(c) {
  conn = c;
  conn.on('data', data => addMessage("Friend", data));

  // Also call them for video
  const call = peer.call(c.peer, localStream);
  if(call) call.on('stream', s => document.getElementById('remoteVideo').srcObject = s);
}

function toggleChat() {
  const chat = document.getElementById('chatPanel');
  chat.style.display = chat.style.display === 'flex'? 'none' : 'flex';
  document.getElementById('controls').style.display = chat.style.display === 'flex'? 'none' : 'flex';
}

function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if(msg === '' ||!conn ||!conn.open) return;
  conn.send(msg);
  addMessage("You", msg);
  input.value = '';
}

function addMessage(sender, text) {
  const chatBox = document.getElementById('chatMessages');
  chatBox.innerHTML += `<div class="msg"><b>${sender}:</b> ${text}</div>`;
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Your existing functions - I no touch them
function toggleMic() { localStream.getAudioTracks()[0].enabled =!localStream.getAudioTracks()[0].enabled; }
function toggleCam() { localStream.getVideoTracks()[0].enabled =!localStream.getVideoTracks()[0].enabled; }
function leave() { window.location.href = 'index.html'; }
function copyRoom() { navigator.clipboard.writeText(window.location.href); }

init();
