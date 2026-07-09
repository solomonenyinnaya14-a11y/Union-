const ROOM_ID = new URLSearchParams(window.location.search).get('room');
document.getElementById('roomId').innerText = ROOM_ID;

let localStream;
let peer;
let connections = {};
let calls = {};
let bigVideo = null;
let myNumber = 1; // Host is 1
let userCount = 1;
const isHost = window.location.search.includes('host=1');

async function init() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 320 }, // Square video
      audio: true
    });
  } catch(e) { alert("Allow Camera and Microphone"); }

  const myPeerId = isHost? ROOM_ID + '-host' : ROOM_ID + '-guest-' + Date.now();

  peer = new Peer(myPeerId, {
    host: '0.peerjs.com', port: 443, path: '/',
    config: { 'iceServers': [ { urls: 'stun:stun.l.google.com:19302' } ] }
  });

  peer.on('open', id => {
    addVideoStream('local', localStream, myNumber);
    if(!isHost) setTimeout(() => joinRoom(), 1500);
    if(isHost) broadcastUserCount();
  });

  peer.on('connection', c => {
    connections[c.peer] = c;
    setupDataConn(c);
  });

  peer.on('call', call => {
    calls[call.peer] = call;
    call.answer(localStream);
    call.on('stream', stream => {
      const num = getNumberFromPeer(call.peer);
      addVideoStream(call.peer, stream, num);
    });
  });
}

function joinRoom() {
  const c = peer.connect(ROOM_ID + '-host', { reliable: true });
  connections[ROOM_ID + '-host'] = c;
  setupDataConn(c);

  c.on('open', () => {
    const call = peer.call(ROOM_ID + '-host', localStream);
    calls[ROOM_ID + '-host'] = call;
    call.on('stream', stream => {
      const num = getNumberFromPeer(ROOM_ID + '-host');
      addVideoStream(ROOM_ID + '-host', stream, num);
    });
  });
}

function setupDataConn(c) {
  c.on('data', data => {
    if(data.type === 'chat') addMessage(data.num, data.msg);
    if(data.type === 'userCount') {
      userCount = data.count;
      myNumber = data.count + 1;
    }
  });
  c.on('open', () => {
    if(isHost) {
      userCount++;
      broadcastUserCount();
    }
  });
  c.on('close', () => delete connections[c.peer]);
}

function broadcastUserCount() {
  Object.values(connections).forEach(c => {
    if(c.open) c.send({type: 'userCount', count: userCount});
  });
}

function getNumberFromPeer(peerId) {
  // Simple: assign number based on join order
  const keys = Object.keys(calls);
  return keys.indexOf(peerId) + 2; // Host=1, others start from 2
}

function addVideoStream(peerId, stream, number) {
  if(document.getElementById('wrap-' + peerId)) return;
  
  const wrapper = document.createElement('div');
  wrapper.id = 'wrap-' + peerId;
  wrapper.className = 'video-wrapper';
  wrapper.onclick = () => makeBig(peerId);

  const video = document.createElement('video');
  video.id = peerId;
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  if(peerId === 'local') video.muted = true;

  const tag = document.createElement('div');
  tag.className = 'name-tag';
  tag.innerText = number;

  wrapper.appendChild(video);
  wrapper.appendChild(tag);
  document.getElementById('videos').appendChild(wrapper);
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

// Keep alive
setInterval(() => {
  Object.values(connections).forEach(c => {
    if(c.open) c.send({type: 'ping'});
  });
}, 20000);

function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if(msg === '') return;
  Object.values(connections).forEach(c => { if(c.open) c.send({type: 'chat', num: myNumber, msg: msg}); });
  addMessage(myNumber, msg);
  input.value = '';
}

function addMessage(num, text) {
  if(text === 'ping') return;
  const chatBox = document.getElementById('chatMessages');
  chatBox.innerHTML += `<div class="msg"><b>${num}:</b> ${text}</div>`;
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
