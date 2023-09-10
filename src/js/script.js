let serverElement = document.querySelector("#server-address");
let hostElement = document.querySelector("#host-name");
let toggleServerElement = document.querySelector("#toggle-server");
const PORT = 1313;

function generateQr(value) {
  var qr = new QRious({
    element: document.getElementById("qr"),
    value: value,
    size: 200,
  });
}

async function setServerUrl(url) {
  serverElement.innerHTML = url;
}

async function setHostName(name) {
  hostElement.innerHTML = name;
}

async function syncServerStatus() {
  let isServerOn = await window.api.isServerOn();
  toggleServerElement.innerHTML = isServerOn ? "Stop Server" : "Start Server";
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
    for (const network of Object.keys(networks)) {
      let address = networks[network][0];
      let url = "http://" + address + ":" + PORT + "/";
      let qrValue = url + "<peyara>" + hostName;
      if (!network.includes("VMware")) {
        let result = await fetch(url);
        let resultJson = await result.json();
        if (resultJson == "peyara") {
          generateQr(qrValue);
          setServerUrl(url);
          setHostName(hostName);
        }
      }
    }
  } else {
    clearQr();
    setServerUrl("");
    setHostName("");
  }
  await syncServerStatus();
});

syncServerStatus();
displayQr();
