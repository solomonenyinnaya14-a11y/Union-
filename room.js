const ROOM_ID = new URLSearchParams(window.location.search).get('room');
document.getElementById('roomId').innerText = ROOM_ID;

let localStream;
let peer;
let connections = {};
let myPeerId;
let chatOpen = false;

// 1. GET CAM + MIC
async function init() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    document.getElementById('localVideo').srcObject = localStream;
  } catch(e) { alert("Please allow Camera and Microphone access"); }

  // 2. CONNECT TO PEERJS CLOUD
  peer = new Peer(ROOM_ID + '-' + Math.random().toString(36).substr(2, 4), {
    host: '0.peerjs.com', port: 443, path: '/'
  });

  peer.on('open', id => { myPeerId = id; console.log("My ID:", id); });

  peer.on('call', call => {
    call.answer(localStream);
    call.on('stream', remoteStream => showRemoteStream(remoteStream));
    setupConnection(call.peer, call);
  });

  peer.on('connection', conn => setupConnection(conn.peer, null, conn));

  // Auto-try to connect to others in room every 3s
  setInterval(() => {
    if(Object.keys(connections).length < 1) {
      const possibleId = ROOM_ID + '-' + Math.random().toString(36).substr(2, 4);
      if(possibleId!== myPeerId) connectToPeer(possibleId);
    }
  }, 3000);
}

function connectToPeer(peerId) {
  const call = peer.call(peerId, localStream);
  if(call) {
    call.on('stream', remoteStream => showRemoteStream(remoteStream));
    const conn = peer.connect(peerId);
    setupConnection(peerId, call, conn);
  }
}

function setupConnection(peerId, call, conn) {
  if(!connections[peerId]) {
    connections[peerId] = { call, conn };
    if(conn) {
      conn.on('data', data => addMessage("Friend", data));
      conn.on('open', () => console.log("Chat connected to", peerId));
    }
    if(call) { call.on('close', () => delete connections[peerId]); }
  }
}

function showRemoteStream(stream) {
  document.getElementById('remoteVideo').srcObject = stream;
}

// CHAT FUNCTIONS
function toggleChat() {
  chatOpen =!chatOpen;
  document.getElementById('chatPanel').style.display = chatOpen? 'flex' : 'none';
  if(chatOpen) setTimeout(() => document.getElementById('chatInput').focus(), 100);
}

function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if(msg === '') return;
  
  Object.values(connections).forEach(c => {
    if(c.conn && c.conn.open) c.conn.send(msg);
  });
  
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

// FIX: Scroll chat when keyboard opens on mobile
document.getElementById('chatInput').addEventListener('focus', () => {
  setTimeout(() => {
    document.getElementById('chatMessages').scrollTop = 99999;
  }, 300);
});

// CONTROLS
function toggleMic() {
  localStream.getAudioTracks()[0].enabled =!localStream.getAudioTracks()[0].enabled;
  document.getElementById('micBtn').classList.toggle('active');
}
function toggleCam() {
  localStream.getVideoTracks()[0].enabled =!localStream.getVideoTracks()[0].enabled;
  document.getElementById('camBtn').classList.toggle('active');
}
function leave() { window.location.href = 'index.html'; }
function copyRoom() {
  navigator.clipboard.writeText(window.location.href);
  document.getElementById('copyBtn').innerText = 'Copied!';
  setTimeout(() => document.getElementById('copyBtn').innerText = 'Copy', 1500);
}

init();
