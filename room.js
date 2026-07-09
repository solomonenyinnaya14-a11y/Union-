const ROOM_ID = new URLSearchParams(window.location.search).get('room');
document.getElementById('roomId').innerText = ROOM_ID;

let localStream;
let peer;
let connections = {}; // Store all peer connections
let calls = {}; // Store all video calls
const isHost = window.location.search.includes('host=1');

async function init() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    document.getElementById('localVideo').srcObject = localStream;
  } catch(e) { alert("Allow Camera and Microphone"); }

  const myPeerId = isHost? ROOM_ID + '-host' : ROOM_ID + '-guest-' + Date.now();

  peer = new Peer(myPeerId, {
    host: '0.peerjs.com', port: 443, path: '/',
    config: { 'iceServers': [ { urls: 'stun:stun.l.google.com:19302' } ] }
  });

  peer.on('open', id => {
    if(!isHost) setTimeout(() => joinRoom(), 1500);
  });

  // When someone connects to us
  peer.on('connection', c => {
    connections[c.peer] = c;
    setupDataConn(c);
  });

  // When someone calls us
  peer.on('call', call => {
    calls[call.peer] = call;
    call.answer(localStream);
    call.on('stream', stream => addVideoStream(call.peer, stream));
    call.on('close', () => removeVideoStream(call.peer));
  });
}

function joinRoom() {
  const c = peer.connect(ROOM_ID + '-host', { reliable: true });
  connections[ROOM_ID + '-host'] = c;
  setupDataConn(c);

  c.on('open', () => {
    const call = peer.call(ROOM_ID + '-host', localStream);
    calls[ROOM_ID + '-host'] = call;
    call.on('stream', stream => addVideoStream(ROOM_ID + '-host', stream));
  });
}

function setupDataConn(c) {
  c.on('data', data => {
    if(data.type === 'chat') addMessage(data.sender, data.msg);
  });
  c.on('close', () => delete connections[c.peer]);
}

// Add video for new person
function addVideoStream(peerId, stream) {
  if(document.getElementById(peerId)) return;
  const video = document.createElement('video');
  video.id = peerId;
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  document.getElementById('videos').appendChild(video);
}

function removeVideoStream(peerId) {
  const video = document.getElementById(peerId);
  if(video) video.remove();
  delete calls[peerId];
}

// CHAT: Send to all 10 people
function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if(msg === '') return;

  Object.values(connections).forEach(c => {
    if(c.open) c.send({type: 'chat', sender: 'You', msg: msg});
  });
  addMessage("You", msg);
  input.value = '';
}

function addMessage(sender, text) {
  const chatBox = document.getElementById('chatMessages');
  chatBox.innerHTML += `<div class="msg"><b>${sender}:</b> ${text}</div>`;
  chatBox.scrollTop = chatBox.scrollHeight;
}

// TOGGLE BUTTONS - Now works for everyone
function toggleMic() {
  localStream.getAudioTracks()[0].enabled =!localStream.getAudioTracks()[0].enabled;
  document.getElementById('micBtn').classList.toggle('active');
}
function toggleCam() {
  localStream.getVideoTracks()[0].enabled =!localStream.getVideoTracks()[0].enabled;
  document.getElementById('camBtn').classList.toggle('active');
}

function toggleChat() {
  const chat = document.getElementById('chatPanel');
  chat.style.display = chat.style.display === 'flex'? 'none' : 'flex';
  document.getElementById('controls').style.display = chat.style.display === 'flex'? 'none' : 'flex';
}

function leave() { window.location.href = 'index.html'; }
function copyRoom() { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }

init();
