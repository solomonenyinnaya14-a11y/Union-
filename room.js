const urlParams = new URLSearchParams(window.location.search);
const ROOM_ID = urlParams.get('room');
document.getElementById('roomId').innerText = ROOM_ID;

const videosGrid = document.getElementById('videos');
const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};

// 1. TURN/STUN SERVERS - THIS FIXES BLACK SCREEN ON IPHONE
const peer = new Peer(undefined, {
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { 
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
      { 
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject", 
        credential: "openrelayproject"
      }
    ]
  }
});

const socket = io();

let myStream;

// 2. GET CAMERA + MIC
navigator.mediaDevices.getUserMedia({
  video: { width: 640, height: 640 }, // square for your grid
  audio: true
}).then(stream => {
  myStream = stream;
  addVideoStream(myVideo, stream, 'You');

  // 3. ANSWER CALLS FROM OTHERS
  peer.on('call', call => {
    call.answer(stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream, call.peer);
    });
    call.on('close', () => video.parentElement.remove());
    peers[call.peer] = call;
  });

  // 4. JOIN ROOM
  socket.emit('join-room', ROOM_ID, peer.id);
});

// 5. CALL NEW USERS WHO JOIN
socket.on('user-connected', userId => {
  setTimeout(() => connectToNewUser(userId, myStream), 1000);
});

function connectToNewUser(userId, stream) {
  const call = peer.call(userId, stream);
  const video = document.createElement('video');
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream, userId);
  });
  call.on('close', () => video.parentElement.remove());
  peers[userId] = call;
}

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close();
});

// 6. ADD VIDEO TO GRID
function addVideoStream(video, stream, name) {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  const wrapper = document.createElement('div');
  wrapper.classList.add('video-wrapper');
  const nameTag = document.createElement('div');
  nameTag.classList.add('name-tag');
  nameTag.innerText = name;
  wrapper.append(video, nameTag);
  videosGrid.append(wrapper);
}

// 7. CONTROLS
function toggleMic() {
  const btn = document.getElementById('micBtn');
  myStream.getAudioTracks()[0].enabled =!myStream.getAudioTracks()[0].enabled;
  btn.classList.toggle('active');
  btn.innerText = myStream.getAudioTracks()[0].enabled? '🎤' : '🔇';
}

function toggleCam() {
  const btn = document.getElementById('camBtn');
  myStream.getVideoTracks()[0].enabled =!myStream.getVideoTracks()[0].enabled;
  btn.classList.toggle('active');
  btn.innerText = myStream.getVideoTracks()[0].enabled? '📹' : '🚫';
}

function leave() {
  window.location.href = '/';
}

// 8. COPY ROOM LINK
function copyRoom() {
  navigator.clipboard.writeText(window.location.href);
  alert('Room link copied!');
}

// 9. CHAT
function toggleChat() {
  const panel = document.getElementById('chatPanel');
  panel.style.display = panel.style.display === 'flex'? 'none' : 'flex';
}

function sendChat() {
  const input = document.getElementById('chatInput');
  if (input.value.trim() === '') return;
  addMessage('You', input.value);
  socket.emit('chat', ROOM_ID, input.value);
  input.value = '';
}

socket.on('chat', (name, msg) => addMessage(name, msg));

function addMessage(name, msg) {
  const div = document.createElement('div');
  div.classList.add('msg');
  div.innerHTML = `<b>${name}:</b> ${msg}`;
  document.getElementById('chatMessages').append(div);
  document.getElementById('chatMessages').scrollTop = 99999;
}

document.getElementById('chatInput').addEventListener('keypress', e => {
  if(e.key === 'Enter') sendChat();
});
