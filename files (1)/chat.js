const socket = io();
const chatBox = document.getElementById('messageBox');
const input = document.getElementById('messageInput');
const userId = localStorage.getItem('userId');
const partnerId = localStorage.getItem('partnerId');
const partnerName = localStorage.getItem('partnerName') || 'Partner';

if (!userId || !partnerId) {
  window.location.replace(userId ? 'dashboard.html' : 'login.html');
}

function getRoomId() {
  return [userId, partnerId].sort().join('_');
}

// Register + join on every (re)connect, otherwise a dropped connection
// leaves the server without your socket id or room.
socket.on('connect', () => {
  socket.emit('registerUser', userId);
  socket.emit('joinRoom', getRoomId());
});

// ---------- Chat ----------
function appendMessage(from, text) {
  chatBox.value += `${from}: ${text}\n`;
  chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById('sendBtn').addEventListener('click', sendMessage);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const message = input.value.trim();
  if (!message) return;
  appendMessage('You', message);
  socket.emit('chat message', { room: getRoomId(), from: userId, message });
  input.value = '';
}

socket.on('chat message', ({ message }) => {
  appendMessage(partnerName, message);
});

function endChat() {
  endVideoCall();
  window.location.href = 'feedback.html';
}

function goBack() {
  endVideoCall();
  window.location.href = 'dashboard.html';
}

// ---------- Video call ----------
let localStream = null;
let peerConnection = null;
let pendingCandidates = []; // ICE candidates that arrive before the remote description
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

document.getElementById('startVideoBtn').addEventListener('click', () => {
  socket.emit('callUser', { to: partnerId, from: userId });
  alert('📞 Calling your partner...');
});

socket.on('callUser', async ({ from }) => {
  const accept = window.confirm(`${partnerName} is calling. Accept the video call?`);
  if (!accept) {
    socket.emit('callDeclined', { to: from });
    return;
  }
  // Wait until our peer connection exists BEFORE telling the caller to send
  // the offer; otherwise the offer arrives too early and gets dropped.
  const ok = await startVideo(true);
  if (ok) socket.emit('callAccepted', { to: from, from: userId });
  else socket.emit('callDeclined', { to: from });
});

socket.on('callAccepted', () => {
  startVideo(false);
});

socket.on('callDeclined', () => {
  alert('❌ Partner declined the call.');
});

async function startVideo(isReceiver) {
  if (peerConnection) return true; // already in a call

  document.getElementById('videoContainer').style.display = 'flex';
  document.getElementById('videoControls').style.display = 'block';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: true
    });

    localStream = stream;
    document.getElementById('localVideo').srcObject = stream;

    peerConnection = new RTCPeerConnection(config);
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-candidate', { to: partnerId, candidate: event.candidate });
      }
    };

    peerConnection.ontrack = (event) => {
      document.getElementById('remoteVideo').srcObject = event.streams[0];
    };

    if (!isReceiver) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('webrtc-offer', { to: partnerId, offer });
    }
    return true;
  } catch (err) {
    alert('⚠️ Cannot access devices: ' + err.message);
    console.error(err);
    endVideoCall();
    return false;
  }
}

async function flushCandidates() {
  for (const c of pendingCandidates) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(c));
    } catch (err) {
      console.error('Error adding ICE candidate', err);
    }
  }
  pendingCandidates = [];
}

socket.on('webrtc-offer', async ({ offer }) => {
  if (!peerConnection) return;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  await flushCandidates();
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('webrtc-answer', { to: partnerId, answer });
});

socket.on('webrtc-answer', async ({ answer }) => {
  if (!peerConnection) return;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  await flushCandidates();
});

socket.on('webrtc-candidate', async ({ candidate }) => {
  if (!peerConnection || !peerConnection.remoteDescription) {
    pendingCandidates.push(candidate); // add once the remote description is set
    return;
  }
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.error('Error adding ICE candidate', err);
  }
});

function endVideoCall() {
  if (peerConnection) peerConnection.close();
  if (localStream) localStream.getTracks().forEach(track => track.stop());
  peerConnection = null;
  localStream = null;
  pendingCandidates = [];
  document.getElementById('localVideo').srcObject = null;
  document.getElementById('remoteVideo').srcObject = null;
  document.getElementById('videoContainer').style.display = 'none';
  document.getElementById('videoControls').style.display = 'none';
}
