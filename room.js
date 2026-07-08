const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const status = document.getElementById('status');
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room') || 'unknown';
document.getElementById('roomIdDisplay').innerText = `Room: ${roomId}`;

let localStream;
let peerConnection;

const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

async function startCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        status.innerHTML = "Camera on.<br>Share this link for someone to join.";
        createPeerConnection();
    } catch (err) {
        alert("Please allow camera and microphone access to use Union");
        console.error("Error accessing media devices:", err);
    }
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(config);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            status.style.display = 'none';
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log("ICE Candidate:", JSON.stringify(event.candidate));
        }
    };

    peerConnection.onconnectionstatechange = () => {
        console.log("Connection state:", peerConnection.connectionState);
    };
}

let micOn = true;
document.getElementById('micBtn').onclick = () => {
    micOn =!micOn;
    if(localStream) localStream.getAudioTracks()[0].enabled = micOn;
    document.getElementById('micBtn').innerText = micOn? '🎤' : '🔇';
}

let camOn = true;
document.getElementById('camBtn').onclick = () => {
    camOn =!camOn;
    if(localStream) localStream.getVideoTracks()[0].enabled = camOn;
    document.getElementById('camBtn').innerText = camOn? '📹' : '🚫';
}

document.getElementById('screenBtn').onclick = async () => {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getTracks()[0];
        const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
        if(sender) sender.replaceTrack(screenTrack);
        screenTrack.onended = () => {
            if(localStream) sender.replaceTrack(localStream.getVideoTracks()[0]);
        };
    } catch(err) {
        console.error("Error sharing screen:", err);
    }
}

document.getElementById('endBtn').onclick = () => {
    if(peerConnection) peerConnection.close();
    if(localStream) localStream.getTracks().forEach(track => track.stop());
    window.location.href = 'index.html';
}

function copyRoom() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Room link copied to clipboard!');
    });
}

window.addEventListener('load', startCamera);
