let hostElement = document.querySelector("#host-name");
let versionTextElement = document.querySelector("#version-text");
let textInputElement = document.querySelector("#text-input");
let textSendElement = document.querySelector("#text-send");
let copyElement = document.querySelector("#copy");
let copyTextElement = document.querySelector("#copy-text");
let shareScreenElement = document.querySelector("#share-screen");
let pathInputElement = document.querySelector("#path-input");
let changePathInputElement = document.querySelector("#change-path-input");
let showRecievedFilesElement = document.querySelector("#show-recieved-files");

const PORT = 1313;
const SERVER_REST_RESPONSE = "peyara";
const QRCODE_SECRET = "<peyara>";
let peerConnection;
let peerConnectionStatus = "";

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

textSendElement.addEventListener("click", async () => {
  await window.api.sendText(textInputElement.value);
  textInputElement.value = "";
});

copyElement.addEventListener("click", async () => {
  await window.api.copyText(textInputElement.value);
  copyTextElement.innerHTML = "Copied to clipboard!";
  setTimeout(() => {
    copyTextElement.innerHTML = "Send text to phone";
  }, 1000);
});

var socket = io(`http://localhost:${PORT}`);
socket.on("connect", function () {
  console.log("Socket Connected");
});
socket.on("answer", function (answer) {
  if (answer) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }
});
socket.on("recieve-answer-ice-candidate", async function (iceCandidate) {
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

    for (let track of stream.getTracks()) {
      await peerConnection.addTrack(track, stream);
    }
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer); // initiate the webrtc call
    peerConnection.addEventListener(
      "connectionstatechange",
      (event) => {
        console.log("peer", peerConnection.connectionState);
        peerConnectionStatus = peerConnection.connectionState;
        switch (peerConnection.connectionState) {
          case "new":
          case "connecting":
            console.log("Connecting…");
            break;
          case "connected":
            console.log("Online");
            shareScreenElement.innerHTML = "Stop Screen Sharing.";
            break;
          case "disconnected" || "closed" || "failed":
            console.log("Disconnecting…");
            shareScreenElement.innerHTML = "Share Screen";
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

async function stopPeer() {
  peerConnection?.close();
  peerConnectionStatus = "disconnected";
  shareScreenElement.innerHTML = "Share Screen";
}
shareScreenElement.addEventListener("click", async () => {
  const socketsList = await window.api.getSocketsList();
  console.log(socketsList, peerConnectionStatus);
  if (socketsList.length > 1 && peerConnectionStatus !== "connected") {
    startPeer();
  } else {
    if (peerConnectionStatus === "connected") {
      socket.emit("stop-screen-share");
      stopPeer();
    } else {
      alert("No clients connected yet to share screen with.");
    }
  }
});
function sleep(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(null);
    }, time);
  });
}

changePathInputElement.addEventListener("click", async () => {
  const path = await window.api.openDiretory();
  if (path) {
    localStorage.setItem("upload-path", path);
    await window.api.setUploadPath(path);
    pathInputElement.value = path;
  }
});

showRecievedFilesElement.addEventListener("click", async () => {
  await window.api.openUploadDirectory();
});

async function initServer() {
  let hostName = await window.api.getHostName();
  let networks = await window.api.getServerAddress();
  let appVersion = await window.api.getAppVersion();
  let servers = [appVersion, QRCODE_SECRET, hostName]; // first element will be used to verify the qr code and the second one contains the host name
  for (const network of Object.keys(networks)) {
    let address = networks[network][0];
    let url = "http://" + address + ":" + PORT + "/";
    let result = await Promise.race([fetch(url), sleep(1000)]);
    if (!result) {
      continue;
    }
    let resultJson = await result.json();
    if (resultJson == SERVER_REST_RESPONSE) {
      // server returned correct response so a possible server address
      servers.push(url);
    }
  }
  let qrValue = servers.join(",");
  generateQr(qrValue);
  setHostName(hostName);
  versionTextElement.innerHTML = "v" + appVersion;

  let uploadPath = localStorage.getItem("upload-path");
  if (uploadPath) {
    await window.api.setUploadPath(uploadPath);
  } else {
    uploadPath = await window.api.getUploadPath();
  }
  pathInputElement.value = uploadPath;
}

// Start Server on app
initServer();
