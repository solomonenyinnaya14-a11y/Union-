function generateRoomId() {
    return Math.random().toString(36).substring(2, 8);
}

function copyLink(link) {
    navigator.clipboard.writeText(link).then(() => {
        alert('Link copied!\n' + link);
    });
}

function startCall() {
    const roomId = generateRoomId();
    const link = `room.html?room=${roomId}`;
    const fullLink = window.location.origin + '/' + link;
    copyLink(fullLink);
    window.location.href = link;
}

const joinModal = document.getElementById('joinModal');
document.getElementById('joinBtnNav').addEventListener('click', () => joinModal.classList.add('active'));
document.getElementById('joinBtnHero').addEventListener('click', () => joinModal.classList.add('active'));
document.getElementById('closeModal').addEventListener('click', () => joinModal.classList.remove('active'));

document.getElementById('goToRoom').addEventListener('click', () => {
    const input = document.getElementById('roomInput').value.trim();
    if(input.includes('room=')) {
        window.location.href = input;
    } else if(input.length > 3) {
        window.location.href = `room.html?room=${input}`;
    } else {
        alert('Please enter a valid meeting link or room ID');
    }
});

document.getElementById('startBtnNav').addEventListener('click', startCall);
document.getElementById('startBtnHero').addEventListener('click', startCall);

joinModal.addEventListener('click', (e) => {
    if(e.target === joinModal) joinModal.classList.remove('active');
});
