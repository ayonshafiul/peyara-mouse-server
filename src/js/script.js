let serverElement = document.querySelector("#server-address");
let toggleServerElement = document.querySelector("#toggle-server");
const PORT = 1313;

function generateQr(value) {
  var qr = new QRious({
    element: document.getElementById("qr"),
    value: value,
    size: 200,
  });
}

async function showServerUrl(url) {
  serverElement.innerHTML = url;
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

async function displayQr() {
  let networks = await window.api.getServerAddress();
  for (const network of Object.keys(networks)) {
    let address = networks[network][0];
    let url = "http://" + address + ":" + PORT + "/";
    if (!network.includes("VMware")) {
      let result = await fetch(url);
      let resultJson = await result.json();
      if (resultJson == "peyara") {
        generateQr(url);
        showServerUrl(url);
      }
    }
  }
}

toggleServerElement.addEventListener("click", async () => {
  await window.api.toggleServer();
  let isServerOn = await window.api.isServerOn();
  if (isServerOn) {
    await syncServerStatus();
    await displayQr();
  } else {
    await syncServerStatus();
    clearQr();
    showServerUrl("");
  }
});

syncServerStatus();
displayQr();
