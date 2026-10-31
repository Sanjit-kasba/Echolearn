const socket = io();
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const endBtn = document.getElementById("endBtn");

let localStream;
let peerConnection;

const servers = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    }
  ]
};

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localVideo.srcObject = stream;
    localStream = stream;

    socket.emit("ready");
  })
  .catch(error => console.error("Media error:", error));

socket.on("ready", () => {
  if (!peerConnection) {
    createPeerConnection(true);
  }
});

socket.on("offer", offer => {
  if (!peerConnection) {
    createPeerConnection(false);
  }
  peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  peerConnection.createAnswer()
    .then(answer => {
      peerConnection.setLocalDescription(answer);
      socket.emit("answer", answer);
    });
});

socket.on("answer", answer => {
  peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice-candidate", candidate => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

function createPeerConnection(isCaller) {
  peerConnection = new RTCPeerConnection(servers);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate);
    }
  };

  if (isCaller) {
    peerConnection.createOffer()
      .then(offer => {
        peerConnection.setLocalDescription(offer);
        socket.emit("offer", offer);
      });
  }
}

endBtn.addEventListener("click", () => {
  if (peerConnection) peerConnection.close();
  window.close(); // closes the video tab
});
