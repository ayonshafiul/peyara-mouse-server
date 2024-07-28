// preload.js

const { ipcRenderer, contextBridge } = require("electron");

let screenId = null;

ipcRenderer.on("SET_SOURCE_ID", async (event, sourceId) => {
  screenId = sourceId;
});

contextBridge.exposeInMainWorld("api", {
  getServerAddress: () => ipcRenderer.invoke("get-server-address"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getSocketsList: () => ipcRenderer.invoke("get-sockets-list"),
  getHostName: () => ipcRenderer.invoke("get-host-name"),
  sendText: (text) => ipcRenderer.invoke("send-text", text),
  copyText: (text) => ipcRenderer.invoke("copy-text", text),
  onRecieveText: (callback) =>
    ipcRenderer.on("recieve-text", (_event, value) => callback(value)),
  getScreenId: () => screenId,
});
