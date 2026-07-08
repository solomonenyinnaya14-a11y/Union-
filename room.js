const ROOM_ID = new URLSearchParams(window.location.search).get('room');
document.getElementById('roomId').innerText = ROOM_ID;

let localStream;
let peer;
let connections = {};
let myPeerId;
let chatOpen = false;

async function init() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    document.getElementById('localVideo').srcObject = localStream;
  } catch(e) { alert("Please allow Camera and Microphone access"); }

  // FIX 1: Use same base ID for everyone in room so they can find each other
  myPeerId = ROOM_ID + '-' + Math.floor(Math.random() * 1000);
  
  peer = new Peer(myPeerId, {
    host: '0.peerjs.com', port: 443, path: '/'
  });

  peer.on('open', id => { 
    myPeerId = id; 
    console.log("My ID:", id);
    // Try to connect to the other 1000 possible IDs in room
    tryConnectToRoom();
  });

  peer.on('call', call => {
    call.answer(localStream);
    call.on('stream', remoteStream => showRemoteStream(remoteStream));
    setupConnection(call.peer, call);
  });

  // FIX 2: This was missing - when someone connects to us via chat
  peer.on('connection', conn => {
    setupConnection(conn.peer, null, conn);
  });

}

function tryConnectToRoom() {
  // Try IDs 0-999 in the same room
  for(let i = 0; i < 1000; i++) {
    const targetId = ROOM_ID + '-' + i;
    if(targetId!== myPeerId &&!connections[targetId]) {
      connectToPeer(targetId);
    }
  }
}

function connectToPeer(peerId) {
  const call = peer.call(peerId, localStream);
  if(call) {
    call.on('stream', remoteStream => showRemoteStream(remoteStream));
    call.on('close', () => delete connections[peerId]);
  }
  const conn = peer.connect(peerId);
  setupConnection(peerId, call, conn);
}

function setupConnection(peerId, call, conn) {
  if(!connections[peerId]) {
    connections[peerId] = { call, conn };
    
    if(conn) {
      // FIX 3: Wait for connection to actually open
      conn.on('open', () => {
        console.log("Chat connected to", peerId);
      });
      conn.on('data', data => addMessage("Friend", data));
      conn.on('close', () => delete connections[peerId]);
    }
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
  
  // FIX 4: Send to all open connections
  let sent = false;
  Object.values(connections).forEach(c => {
    if(c.conn && c.conn.open) {
      c.conn.send(msg);
      sent = true;
    }
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

// KEYBOARD FIX
const chatInput = document.getElementById('chatInput');
chatInput.addEventListener('focus', () => {
  document.getElementById('controls').style.bottom = '300px';
  setTimeout(() => { document.getElementById('chatMessages').scrollTop = 99999; }, 300);
});
chatInput.addEventListener('blur', () => {
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
function copyRoom() {
  navigator.clipboard.writeText(window.location.href);
  alert("Link copied!");
}

init();
