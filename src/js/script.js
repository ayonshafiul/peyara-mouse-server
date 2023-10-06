let hostElement = document.querySelector("#host-name");
let toggleServerElement = document.querySelector("#toggle-server");
let mobileInstructionsElement = document.querySelector("#mobile-instructions");

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

syncServerStatus();
displayQr();
