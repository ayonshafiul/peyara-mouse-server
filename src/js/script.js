let hostElement = document.querySelector("#host-name");
let toggleServerElement = document.querySelector("#toggle-server");
let mobileInstructionsElement = document.querySelector("#mobile-instructions");
let videoElement = document.querySelector("#screen");
let cameraElement = document.querySelector("#camera");
let peerElement = document.querySelector("#start-peer");
let peerConnection;

const PORT = 1313;
const SERVER_REST_RESPONSE = "peyara";
const QRCODE_SECRET = "<peyara>";

function generateQr(value) {
  var qr = new QRious({
    element: document.getElementById("qr"),
    value: value,
    size: 200,
  });
}

function setHostName(name) {
  hostElement.innerHTML = name;
}

async function syncServerStatus() {
  let isServerOn = await window.api.isServerOn();
  toggleServerElement.innerHTML = isServerOn ? "Stop Server" : "Start Server";
}

async function syncInstructions() {
  let isServerOn = await window.api.isServerOn();
  mobileInstructionsElement.style.display = isServerOn ? "block" : "none";
}

function clearQr() {
  let canvas = document.getElementById("qr");
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
}

toggleServerElement.addEventListener("click", async () => {
  await window.api.toggleServer();
  let isServerOn = await window.api.isServerOn();
  let hostName = await window.api.getHostName();
  if (isServerOn) {
    let networks = await window.api.getServerAddress();
    let servers = [QRCODE_SECRET, hostName]; // first element will be used to verify the qr code and the second one contains the host name
    for (const network of Object.keys(networks)) {
      let address = networks[network][0];
      let url = "http://" + address + ":" + PORT + "/";

      let result = await fetch(url);
      let resultJson = await result.json();
      if (resultJson == SERVER_REST_RESPONSE) {
        // server returned correct response so a possible server address
        servers.push(url);
      }
    }
    let qrValue = servers.join(",");
    generateQr(qrValue);
    setHostName(hostName);
  } else {
    clearQr();
    setHostName("");
  }
  syncServerStatus();
  syncInstructions();
});

var socket = io("http://localhost:1313");
console.log(io);
socket.on("connect", function () {
  console.log("Socket Connected");
});
socket.on("answer", function (answer) {
  console.log("answer recieved on client", JSON.stringify(answer));
  peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});
socket.on("recieve-answer-ice-candidate", async function (iceCandidate) {
  console.log("Answer ice candidate on pc", iceCandidate);
  if (iceCandidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
  }
});
socket.on("disconnect", function () {});

async function startPeer() {
  peerConnection = new RTCPeerConnection();

  let screenId = await window.api.getScreenId();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: screenId,
          minWidth: 1280,
          maxWidth: 1280,
          minHeight: 720,
          maxHeight: 720,
        },
      },
    });
    videoElement.srcObject = stream;

    let localStream = stream;
    console.log(stream, "stream");
    console.log(localStream.getTracks(), "tracks");
    for (let track of localStream.getTracks()) {
      await peerConnection.addTrack(track, localStream);
    }
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
    peerConnection.addEventListener(
      "connectionstatechange",
      (event) => {
        switch (peerConnection.connectionState) {
          case "new":
          case "connecting":
            console.log("Connecting…");
            break;
          case "connected":
            console.log("Online");

            break;
          case "disconnected":
            console.log("Disconnecting…");
            break;
          case "closed":
            console.log("Offline");
            break;
          case "failed":
            console.log("Error");
            break;
          default:
            console.log("Unknown");
            break;
        }
      },
      false
    );
    peerConnection.addEventListener("icecandidate", (event) => {
      console.log("Emitting ice candidate from pc", event.candidate);

      socket.emit("offer-ice-candidate", event.candidate);
    });
    peerConnection.addEventListener("iceconnectionstatechange", (event) => {
      console.log("Ice connection state change", event);
    });
    peerConnection.ontrack = (event) => {
      console.log("recieved tracks", event);
      // event.streams contains a MediaStream with the received track
      const [stream] = event.streams;

      // Assuming you have a video element in your component
      cameraElement.srcObject = stream;
    };
  } catch (e) {
    console.log(e);
  }
}
startPeer();
