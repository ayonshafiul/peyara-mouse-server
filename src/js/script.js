let hostElement = document.querySelector("#host-name");
let toggleServerElement = document.querySelector("#toggle-server");
let mobileInstructionsElement = document.querySelector("#mobile-instructions");
let textInputElement = document.querySelector("#text-input");
let textSendElement = document.querySelector("#text-send");
let copyElement = document.querySelector("#copy");
let shareScreenElement = document.querySelector("#share-screen");

const PORT = 1313;
const SERVER_REST_RESPONSE = "peyara";
const QRCODE_SECRET = "<peyara>";
let peerConnection;

function generateQr(value) {
  var qr = new QRious({
    element: document.getElementById("qr"),
    value: value,
    size: 200,
  });
}

window.api.onRecieveText((text) => {
  textInputElement.value = text;
});

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

textSendElement.addEventListener("click", async () => {
  await window.api.sendText(textInputElement.value);
  textInputElement.value = "";
});

copyElement.addEventListener("click", async () => {
  await window.api.copyText(textInputElement.value);
  copyElement.innerHTML = "Copied!";
  setTimeout(() => {
    copyElement.innerHTML = "Copy to clipboard";
  }, 1000);
});

var socket = io("http://localhost:1313");
console.log(io);
socket.on("connect", function () {
  console.log("Socket Connected");
});
socket.on("answer", function (answer) {
  console.log("answer recieved on client", JSON.stringify(answer));
  if (answer) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }
});
socket.on("recieve-answer-ice-candidate", async function (iceCandidate) {
  console.log("Answer ice candidate on pc", iceCandidate);
  if (iceCandidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
  }
});
socket.on("disconnect", function () {
  console.log("Socket Disconnected");
});

async function startPeer() {
  peerConnection = new RTCPeerConnection();

  let screenId = await window.api.getScreenId();
  console.log(screenId, "screenId");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "desktop",
        },
      },
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

    console.log(stream.getTracks(), "tracks");
    for (let track of stream.getTracks()) {
      await peerConnection.addTrack(track, stream);
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
    };
  } catch (e) {
    console.log(e);
  }
}
shareScreenElement.addEventListener("click", () => {
  console.log("Sharing screen");
  startPeer();
});
