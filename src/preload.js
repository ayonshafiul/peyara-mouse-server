// preload.js

const { ipcRenderer, contextBridge } = require("electron");
const os = require("os");

contextBridge.exposeInMainWorld("api", {
  cpuCount: os.cpus().length,
  toggleServer: () => ipcRenderer.invoke("toggle-server"),
  isServerOn: () => ipcRenderer.invoke("is-server-on"),
  getServerAddress: () => ipcRenderer.invoke("get-server-address"),
});
