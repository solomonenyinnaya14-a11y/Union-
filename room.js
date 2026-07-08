const socket = io(); // connects to same domain
const ROOM_ID = new URLSearchParams(window.location.search).get('room');
document.getElementById('roomId').innerText = ROOM_ID;

let localStream;
let peer;
let connections = {};
let chatOpen = false;

async function init() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    document.getElementById('localVideo').srcObject = localStream;
  } catch(e) { alert("Please allow Camera and Microphone"); }

  peer = new Peer(undefined, {
    host: '0.peerjs.com', port: 443, path: '/', debug: 2
  });

  peer.on('open', myPeerId => {
    console.log("My Peer ID:", myPeerId);
    socket.emit('join-room', ROOM_ID, myPeerId);
  });

  // Someone is calling us
  peer.on('call', call => {
    call.answer(localStream);
    call.on('stream', remoteStream => showRemoteStream(remoteStream));
    setupConnection(call.peer, call);
  });

  // Socket tells us someone joined
  socket.on('user-connected', peerId => {
    console.log("User connected:", peerId);
    connectToNewUser(peerId);
  });
}

function connectToNewUser(peerId) {
  const call = peer.call(peerId, localStream);
  if(call) {
    call.on('stream', remoteStream => showRemoteStream(remoteStream));
    call.on('close', () => { /* remove video */ });
  }
  
  const conn = peer.connect(peerId, { reliable: true });
  setupConnection(peerId, call, conn);
}

function setupConnection(peerId, call, conn) {
  if(connections[peerId]) return;
  connections[peerId] = { call, conn };
  
  if(conn) {
    conn.on('open', () => console.log("Data channel open with", peerId));
    conn.on('data', data => addMessage("Friend", data));
    conn.on('close', () => delete connections[peerId]);
  }
}

function showRemoteStream(stream) {
  const remoteVideo = document.getElementById('remoteVideo');
  if(!remoteVideo.srcObject) { // only set once
    remoteVideo.srcObject = stream;
  }
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
