const ROOM_ID = new URLSearchParams(window.location.search).get('room');
document.getElementById('roomId').innerText = ROOM_ID;

let localStream;
let peer;
let connections = {};
let chatOpen = false;

// Everyone tries to connect to the "host" ID
const HOST_ID = ROOM_ID + '-host'; 
const MY_ID = ROOM_ID + '-' + Math.random().toString(36).substr(2, 5);

async function init() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    document.getElementById('localVideo').srcObject = localStream;
  } catch(e) { alert("Please allow Camera and Microphone"); }

  peer = new Peer(MY_ID, {
    host: '0.peerjs.com', port: 443, path: '/', debug: 2
  });

  peer.on('open', id => { 
    console.log("I am:", id);
    // Wait 1s then try to become host. If taken, join as guest
    setTimeout(tryToBeHost, 1000);
  });

  peer.on('call', call => {
    call.answer(localStream);
    call.on('stream', s => showRemoteStream(s));
    setupConn(call.peer, call);
  });

  peer.on('connection', conn => {
    setupConn(conn.peer, null, conn);
  });
}

function tryToBeHost() {
  // Try to claim the host ID
  const hostPeer = new Peer(HOST_ID, {
    host: '0.peerjs.com', port: 443, path: '/'
  });
  
  hostPeer.on('open', () => {
    console.log("I am HOST");
    peer = hostPeer; // switch to host
    setupHostListeners();
  });
  
  hostPeer.on('error', () => {
    console.log("Host taken, joining as guest");
    joinAsGuest(); // host already exists
  });
}

function setupHostListeners() {
  peer.on('call', call => {
    call.answer(localStream);
    call.on('stream', s => showRemoteStream(s));
    setupConn(call.peer, call);
  });
  peer.on('connection', conn => setupConn(conn.peer, null, conn));
}

function joinAsGuest() {
  const call = peer.call(HOST_ID, localStream);
  if(call){
    call.on('stream', s => showRemoteStream(s));
    setupConn(HOST_ID, call);
  }
  const conn = peer.connect(HOST_ID, { reliable: true }); // reliable = chat won't drop
  setupConn(HOST_ID, null, conn);
}

function setupConn(peerId, call, conn) {
  if(connections[peerId]) return;
  connections[peerId] = { call, conn };
  
  if(conn) {
    conn.on('open', () => console.log("Chat open with", peerId));
    conn.on('data', data => addMessage("Friend", data)); // THIS makes chat 2-way
    conn.on('close', () => delete connections[peerId]);
  }
}

function showRemoteStream(stream) {
  document.getElementById('remoteVideo').srcObject = stream;
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
  
  // Send to ALL connected peers
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

// Keyboard lift
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
