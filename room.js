const ROOM_ID = new URLSearchParams(window.location.search).get('room');
document.getElementById('roomId').innerText = ROOM_ID;

let localStream;
let peer;
let conn = null; // only 1 connection for 1v1 call
let myPeerId = '';

async function init() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    document.getElementById('localVideo').srcObject = localStream;
  } catch(e) { alert("Allow Camera and Microphone"); }

  // Generate ID: if url has?host=1 then you are host
  const isHost = window.location.search.includes('host=1');
  myPeerId = isHost? ROOM_ID + '-host' : ROOM_ID + '-guest-' + Date.now();

  peer = new Peer(myPeerId, {
    host: '0.peerjs.com', port: 443, path: '/'
  });

  peer.on('open', id => {
    console.log("My ID:", id);
    if(!isHost) {
      // Guest: wait 1.5s then connect to host
      setTimeout(() => joinHost(), 1500);
    }
  });

  // If someone connects to us for chat
  peer.on('connection', c => {
    conn = c;
    conn.on('data', data => addMessage("Friend", data));
  });

  // If someone calls us for video
  peer.on('call', call => {
    call.answer(localStream);
    call.on('stream', stream => {
      document.getElementById('remoteVideo').srcObject = stream;
    });
  });
}

function joinHost() {
  conn = peer.connect(ROOM_ID + '-host', { reliable: true });

  conn.on('open', () => {
    console.log("Connected to host");
    // Also call host for video
    const call = peer.call(ROOM_ID + '-host', localStream);
    call.on('stream', stream => {
      document.getElementById('remoteVideo').srcObject = stream;
    });
  });

  conn.on('data', data => addMessage("Friend", data));
  conn.on('error', err => console.log(err));
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
    conn.send(msg); // send to the other person
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
