const ROOM_ID = new URLSearchParams(window.location.search).get('room');
document.getElementById('roomId').innerText = ROOM_ID;

let localStream;
let peer;
let conn;
let isHost = false;

async function init() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    document.getElementById('localVideo').srcObject = localStream;
  } catch(e) { alert("Allow Camera and Microphone"); }

  // Try to claim host ID first. If taken, we are guest
  peer = new Peer(ROOM_ID + '-host', {
    host: '0.peerjs.com', port: 443, path: '/'
  });

  peer.on('open', () => {
    isHost = true;
    console.log("I am HOST");
  });

  peer.on('error', () => {
    // Host taken, join as guest
    peer = new Peer(ROOM_ID + '-guest-' + Date.now(), {
      host: '0.peerjs.com', port: 443, path: '/'
    });
    peer.on('open', id => {
      console.log("I am GUEST:", id);
      joinHost();
    });
  });

  peer.on('connection', c => {
    conn = c;
    conn.on('data', data => addMessage("Friend", data));
  });

  peer.on('call', call => {
    call.answer(localStream);
    call.on('stream', s => document.getElementById('remoteVideo').srcObject = s);
  });
}

function joinHost() {
  conn = peer.connect(ROOM_ID + '-host', { reliable: true });
  conn.on('open', () => console.log("Connected to host"));
  conn.on('data', data => addMessage("Friend", data));
  
  const call = peer.call(ROOM_ID + '-host', localStream);
  call.on('stream', s => document.getElementById('remoteVideo').srcObject = s);
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
  if(msg === '' ||!conn ||!conn.open) return;
  
  conn.send(msg); // Send to the other person
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

// Keyboard lift for iPhone
document.getElementById('chatInput').addEventListener('focus', () => {
  document.getElementById('controls').style.bottom = '300px';
});
document.getElementById('chatInput').addEventListener('blur', () => {
  document.getElementById('controls').style.bottom = '20px';
});

// Keep your existing mic, cam, leave, copy functions
function toggleMic() { localStream.getAudioTracks()[0].enabled =!localStream.getAudioTracks()[0].enabled; document.getElementById('micBtn').classList.toggle('active'); }
function toggleCam() { localStream.getVideoTracks()[0].enabled =!localStream.getVideoTracks()[0].enabled; document.getElementById('camBtn').classList.toggle('active'); }
function leave() { window.location.href = 'index.html'; }
function copyRoom() { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }

init();
