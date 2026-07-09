const ROOM_ID = new URLSearchParams(window.location.search).get('room');
document.getElementById('roomId').innerText = ROOM_ID;

let localStream;
let peer;
let conn = null;

async function init() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    document.getElementById('localVideo').srcObject = localStream;
  } catch(e) { alert("Allow Camera and Microphone"); }

  const isHost = window.location.search.includes('host=1');
  const myPeerId = isHost? ROOM_ID + '-host' : ROOM_ID + '-guest-' + Date.now();

  peer = new Peer(myPeerId, {
    host: '0.peerjs.com', port: 443, path: '/'
  });

  peer.on('open', id => {
    console.log("My ID:", id);
    if(!isHost) {
      setTimeout(() => joinHost(), 1500); // Guest joins host
    }
  });

  // When someone connects to us
  peer.on('connection', c => {
    conn = c; // SAVE IT
    setupConn(c);
  });

  peer.on('call', call => {
    call.answer(localStream);
    call.on('stream', stream => {
      document.getElementById('remoteVideo').srcObject = stream;
    });
  });
}

function joinHost() {
  const c = peer.connect(ROOM_ID + '-host', { reliable: true });
  conn = c; // <-- THIS WAS MISSING. Now we save it
  setupConn(c);

  c.on('open', () => {
    console.log("Connected to host");
    const call = peer.call(ROOM_ID + '-host', localStream);
    call.on('stream', stream => {
      document.getElementById('remoteVideo').srcObject = stream;
    });
  });
}

function setupConn(c) { // <-- NEW FUNCTION
  c.on('data', data => addMessage("Friend", data));
  c.on('close', () => conn = null);
  c.on('error', err => console.log(err));
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

  if(conn && conn.open) {
    conn.send(msg); // Now this will work both ways
  } else {
    alert("Not connected yet. Wait 2 seconds.");
  }

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

function toggleMic() { localStream.getAudioTracks()[0].enabled =!localStream.getAudioTracks()[0].enabled; document.getElementById('micBtn').classList.toggle('active'); }
function toggleCam() { localStream.getVideoTracks()[0].enabled =!localStream.getVideoTracks()[0].enabled; document.getElementById('camBtn').classList.toggle('active'); }
function leave() { window.location.href = 'index.html'; }
function copyRoom() { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }

init();
