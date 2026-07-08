const socket = io();
const ROOM_ID = new URLSearchParams(window.location.search).get('room');
document.getElementById('roomId').innerText = ROOM_ID;
document.getElementById('roomIdTop').innerText = ROOM_ID;

let localStream;
let peer;
let connections = {};
let chatOpen = false;

async function startCall() {
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('roomInfo').style.display = 'flex';
  document.getElementById('controls').style.display = 'flex';

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    document.getElementById('localVideo').srcObject = localStream;
  } catch(e) { alert("Please allow Camera and Microphone in Settings > Safari"); return; }

  peer = new Peer(undefined, { host: '0.peerjs.com', port: 443, path: '/' });

  peer.on('open', myPeerId => {
    socket.emit('join-room', ROOM_ID, myPeerId);
  });

  peer.on('call', call => {
    call.answer(localStream);
    call.on('stream', s => showRemoteStream(s));
    setupConnection(call.peer, call);
  });

  socket.on('user-connected', peerId => {
    connectToNewUser(peerId);
  });
}

function connectToNewUser(peerId) {
  const call = peer.call(peerId, localStream);
  if(call) call.on('stream', s => showRemoteStream(s));
  const conn = peer.connect(peerId, { reliable: true });
  setupConnection(peerId, call, conn);
}

function setupConnection(peerId, call, conn) {
  if(connections[peerId]) return;
  connections[peerId] = { call, conn };
  if(conn) {
    conn.on('open', () => console.log("Chat open"));
    conn.on('data', data => addMessage("Friend", data));
  }
}

function showRemoteStream(stream) {
  const remoteVideo = document.getElementById('remoteVideo');
  remoteVideo.srcObject = stream;
  remoteVideo.play(); // iPhone needs this
}

function toggleChat() {
  chatOpen =!chatOpen;
  document.getElementById('chatPanel').style.display = chatOpen? 'flex' : 'none';
  document.getElementById('controls').style.display = chatOpen? 'none' : 'flex';
  if(chatOpen) setTimeout(() => document.getElementById('chatInput').focus(), 100);
}

function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if(msg === '') return;
  Object.values(connections).forEach(c => { if(c.conn?.open) c.conn.send(msg); });
  addMessage("You", msg);
  input.value = '';
}

function addMessage(sender, text) {
  const chatBox = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = 'msg';
  el.innerHTML = `<b>${sender}:</b> ${text}`;
  chatBox.appendChild(el);
  chatBox.scrollTop = chatBox.scrollHeight;
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
