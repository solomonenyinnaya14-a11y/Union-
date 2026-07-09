const ROOM_ID = new URLSearchParams(window.location.search).get('room');
document.getElementById('roomId').innerText = ROOM_ID;

let localStream;
let peer;
let connections = {};

async function init() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    document.getElementById('localVideo').srcObject = localStream;
  } catch(e) { alert("Please allow Camera and Microphone"); }

  // Random ID so 2 people can join same room
  peer = new Peer(ROOM_ID + '-' + Math.random().toString(36).substr(2,9), {
    host: '0.peerjs.com', port: 443, path: '/'
  });

  peer.on('open', () => {
    console.log("Connected to PeerJS");
    // After 2 seconds, try to find others in the room
    setTimeout(connectToPeers, 2000);
  });

  // When someone connects to us for chat
  peer.on('connection', conn => {
    connections[conn.peer] = conn;
    conn.on('data', data => addMessage("Friend", data));
  });

  // When someone calls us for video
  peer.on('call', call => {
    call.answer(localStream);
    call.on('stream', stream => {
      document.getElementById('remoteVideo').srcObject = stream;
    });
  });
}

function connectToPeers() {
  // Try to connect to common room ID. First person will be host
  const conn = peer.connect(ROOM_ID);
  conn.on('open', () => {
    connections[ROOM_ID] = conn;
    conn.on('data', data => addMessage("Friend", data));

    // Also start video call
    const call = peer.call(ROOM_ID, localStream);
    if(call) {
      call.on('stream', stream => {
        document.getElementById('remoteVideo').srcObject = stream;
      });
    }
  });
}

function toggleChat() {
  const chat = document.getElementById('chatPanel');
  const controls = document.getElementById('controls');
  if(chat.style.display === 'flex') {
    chat.style.display = 'none';
    controls.style.display = 'flex';
  } else {
    chat.style.display = 'flex';
    controls.style.display = 'none';
    setTimeout(() => document.getElementById('chatInput').focus(), 100);
  }
}

function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if(msg === '') return;

  // Send to everyone connected
  Object.values(connections).forEach(conn => {
    if(conn.open) conn.send(msg);
  });

  addMessage("You", msg);
  input.value = '';
}

function addMessage(sender, text) {
  const chatBox = document.getElementById('chatMessages');
  chatBox.innerHTML += `<div class="msg"><b>${sender}:</b> ${text}</div>`;
  chatBox.scrollTop = chatBox.scrollHeight;
}

// iPhone keyboard fix
document.getElementById('chatInput').addEventListener('focus', () => {
  document.getElementById('controls').style.bottom = '300px';
});
document.getElementById('chatInput').addEventListener('blur', () => {
  document.getElementById('controls').style.bottom = '20px';
});

// Your existing buttons
function toggleMic() {
  localStream.getAudioTracks()[0].enabled =!localStream.getAudioTracks()[0].enabled;
  document.getElementById('micBtn').classList.toggle('active');
}
function toggleCam() {
  localStream.getVideoTracks()[0].enabled =!localStream.getVideoTracks()[0].enabled;
  document.getElementById('camBtn').classList.toggle('active');
}
function leave() { window.location.href = 'index.html'; }
function copyRoom() { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }

init();
