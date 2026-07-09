const ROOM_ID = new URLSearchParams(window.location.search).get('room');
document.getElementById('roomId').innerText = ROOM_ID;

let localStream;
let peer;
let connections = {};
let calls = {};
let bigVideo = null;
const isHost = window.location.search.includes('host=1');

async function init() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240 }, // Small for 10 people
      audio: true
    });
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

  peer.on('connection', c => {
    connections[c.peer] = c;
    setupDataConn(c);
  });

  peer.on('call', call => {
    calls[call.peer] = call;
    call.answer(localStream);
    call.on('stream', stream => addVideoStream(call.peer, stream));
    call.on('close', () => { removeVideoStream(call.peer); });
  });

  peer.on('disconnected', () => peer.reconnect());
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

function addVideoStream(peerId, stream) {
  if(document.getElementById(peerId)) return;
  const video = document.createElement('video');
  video.id = peerId;
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  video.onclick = () => makeBig(peerId);
  document.getElementById('videos').appendChild(video);
}

function removeVideoStream(peerId) {
  const video = document.getElementById(peerId);
  if(video) video.remove();
  delete calls[peerId];
}

function makeBig(peerId) {
  const videos = document.getElementById('videos');
  if(bigVideo === peerId) {
    videos.style.gridTemplateColumns = 'repeat(3, 1fr)';
    bigVideo = null;
  } else {
    videos.style.gridTemplateColumns = '1fr';
    bigVideo = peerId;
  }
}

// Keep alive every 20s so video no stop
setInterval(() => {
  Object.values(connections).forEach(c => {
    if(c.open) c.send({type: 'ping'});
  });
}, 20000);

function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if(msg === '') return;
  Object.values(connections).forEach(c => { if(c.open) c.send({type: 'chat', sender: 'You', msg: msg}); });
  addMessage("You", msg);
  input.value = '';
}

function addMessage(sender, text) {
  if(text === 'ping') return;
  const chatBox = document.getElementById('chatMessages');
  chatBox.innerHTML += `<div class="msg"><b>${sender}:</b> ${text}</div>`;
  chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById('chatInput').addEventListener('focus', () => {
  document.getElementById('controls').style.bottom = '300px';
});
document.getElementById('chatInput').addEventListener('blur', () => {
  document.getElementById('controls').style.bottom = '15px';
});

function toggleMic() {
  localStream.getAudioTracks()[0].enabled =!localStream.getAudioTracks()[0].enabled;
  document.getElementById('micBtn').classList.toggle('active');
}
function toggleCam() { // Tap to switch to Voice Call
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
