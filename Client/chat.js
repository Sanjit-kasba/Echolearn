const socket = io();
const chatBox = document.getElementById('messageBox');
const input = document.getElementById('messageInput');
const userId = localStorage.getItem('userId');
const partnerId = localStorage.getItem('partnerId');
const partnerName = localStorage.getItem('partnerName') || 'Partner';

socket.emit('registerUser', userId);

// Chat UI Handling
function appendMessage(from, text) {
  chatBox.value += `${from}: ${text}\n`;
  chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById('sendBtn').addEventListener('click', sendMessage);

function sendMessage() {
  const message = input.value.trim();
  if (!message) return;
  appendMessage('You', message);
  socket.emit('chat message', {
    room: getRoomId(),
    from: 'You',
    message
  });
  input.value = '';
}

socket.emit('joinRoom', getRoomId());

socket.on('chat message', ({ from, message }) => {
  appendMessage(partnerName, message);
});

function getRoomId() {
  return [userId, partnerId].sort().join('_');
}

function endChat() {
  window.location.href = 'feedback.html';
}

function goBack() {
  window.location.href = 'dashboard.html';
}

// ========================
// VIDEO CALL FUNCTIONALITY
// ========================
let localStream, peerConnection, screenStream;
let isSharing = false;
let pendingOffer = null;
let pendingCandidates = [];
const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

document.getElementById('startVideoBtn').addEventListener('click', () => {
  socket.emit('callUser', { to: partnerId, from: userId });
  alert("📞 Calling your partner...");
});

socket.on('callUser', ({ from }) => {
  alert("👥 Partner is calling. Switch to this tab to accept.");
  const accept = window.prompt("Type YES to accept the video call:");
  if (accept?.toLowerCase() === 'yes') {
    startVideo(true);
    socket.emit('callAccepted', { to: from, from: userId });
  } else {
    socket.emit('callDeclined', { to: from });
  }
});

socket.on('callAccepted', () => {
  startVideo(false);
});

socket.on('callDeclined', () => {
  alert("❌ Partner declined the call.");
});

async function startVideo(isReceiver) {
  document.getElementById('videoContainer').style.display = 'flex';
  document.getElementById('videoControls').style.display = 'block';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: true
    });

    localStream = stream;
    document.getElementById('localVideo').srcObject = stream;

    peerConnection = new RTCPeerConnection(config);
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('webrtc-candidate', {
          to: partnerId,
          candidate: event.candidate
        });
      }
    };

    peerConnection.ontrack = event => {
      document.getElementById('remoteVideo').srcObject = event.streams[0];
    };

    if (!isReceiver) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('webrtc-offer', { to: partnerId, offer });
    } else if (pendingOffer) {
      // Offer arrived before our camera was ready
      const o = pendingOffer;
      pendingOffer = null;
      await handleOffer(o);
    }

  } catch (err) {
    alert('⚠️ Cannot access devices: ' + err.message);
    console.error(err);
  }
}

async function flushCandidates() {
  for (const c of pendingCandidates) {
    try { await peerConnection.addIceCandidate(new RTCIceCandidate(c)); }
    catch (err) { console.error("❌ Error adding ICE candidate", err); }
  }
  pendingCandidates = [];
}

async function handleOffer(offer) {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  await flushCandidates();
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('webrtc-answer', { to: partnerId, answer });
}

socket.on('webrtc-offer', async ({ offer }) => {
  if (!peerConnection) {
    pendingOffer = offer; // process once startVideo finishes
    return;
  }
  await handleOffer(offer);
});

socket.on('webrtc-answer', async ({ answer }) => {
  if (!peerConnection) return;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  await flushCandidates();
});

socket.on('webrtc-candidate', async ({ candidate }) => {
  // Queue until remote description is set
  if (!peerConnection || !peerConnection.remoteDescription) {
    pendingCandidates.push(candidate);
    return;
  }
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.error("❌ Error adding ICE candidate", err);
  }
});

// ========================
// SCREEN SHARING
// ========================
const shareBtn = document.getElementById('shareScreenBtn');

if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
  shareBtn.disabled = true;
  shareBtn.title = 'Screen sharing is not supported on this browser/device';
  shareBtn.style.opacity = '0.5';
}

shareBtn.addEventListener('click', () => {
  if (isSharing) stopScreenShare();
  else startScreenShare();
});

function getVideoSender() {
  return peerConnection?.getSenders().find(s => s.track && s.track.kind === 'video');
}

async function startScreenShare() {
  if (!peerConnection) {
    alert('Start a video call first.');
    return;
  }
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];

    const sender = getVideoSender();
    if (!sender) throw new Error('No video sender found');
    await sender.replaceTrack(screenTrack);

    document.getElementById('localVideo').srcObject = screenStream;
    isSharing = true;
    shareBtn.textContent = '⏹ Stop Sharing';
    shareBtn.style.backgroundColor = '#ef4444';

    // Fires when user clicks the browser's own "Stop sharing" bar
    screenTrack.onended = stopScreenShare;
  } catch (err) {
    if (err.name !== 'NotAllowedError') {
      alert('⚠️ Cannot share screen: ' + err.message);
    }
    console.error(err);
  }
}

async function stopScreenShare() {
  if (!isSharing) return;
  isSharing = false;

  if (screenStream) {
    screenStream.getTracks().forEach(t => { t.onended = null; t.stop(); });
    screenStream = null;
  }

  const camTrack = localStream?.getVideoTracks()[0];
  const sender = getVideoSender();
  if (sender && camTrack) await sender.replaceTrack(camTrack);

  document.getElementById('localVideo').srcObject = localStream;
  shareBtn.textContent = '🖥️ Share Screen';
  shareBtn.style.backgroundColor = '#10b981';
}

function endVideoCall() {
  if (isSharing) stopScreenShare();
  if (peerConnection) peerConnection.close();
  peerConnection = null;
  pendingOffer = null;
  pendingCandidates = [];
  if (localStream) localStream.getTracks().forEach(track => track.stop());
  if (screenStream) screenStream.getTracks().forEach(track => track.stop());
  document.getElementById('videoContainer').style.display = 'none';
  document.getElementById('videoControls').style.display = 'none';
}
