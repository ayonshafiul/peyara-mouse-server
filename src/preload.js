// preload.js

const { ipcRenderer, contextBridge } = require("electron");

let screenId = null;

ipcRenderer.on("SET_SOURCE_ID", async (event, sourceId) => {
  console.log(sourceId);
  screenId = sourceId;
});

contextBridge.exposeInMainWorld("api", {
  toggleServer: () => ipcRenderer.invoke("toggle-server"),
  isServerOn: () => ipcRenderer.invoke("is-server-on"),
  getServerAddress: () => ipcRenderer.invoke("get-server-address"),
  getHostName: () => ipcRenderer.invoke("get-host-name"),
  getScreenId: () => screenId,
});
