// main.js

// Modules to control application life and create native browser window
if (require("electron-squirrel-startup")) return;
const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  shell,
  dialog,
  ipcRenderer,
  clipboard,
  desktopCapturer,
} = require("electron");
const killable = require("killable");
const path = require("path");
let robot = require("@jitsi/robotjs");
const expressServer = require("express")();
const { networkInterfaces, hostname } = require("os");
const server = require("http").createServer(expressServer);
const io = require("socket.io")(server);

const isMac = process.platform === "darwin";
const nets = networkInterfaces();
const pcName = hostname();
const results = {};
const PORT = 1313;
let mainWindow;

// all connected socket clients list
let socketsList = [];

// get all possible localhost addresses that will be sent to the client via qr code
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    const familyV4Value = typeof net.family === "string" ? "IPv4" : 4;
    if (net.family === familyV4Value && !net.internal) {
      if (!results[name]) {
        results[name] = [];
      }
      results[name].push(net.address);
    }
  }
}

expressServer.get("/", function (req, res) {
  res.json("peyara");
});

robot.setMouseDelay(1);
robot.setKeyboardDelay(2);
const mediaKeys = {
  audio_mute: "Mute the volume",
  audio_vol_down: "Lower the volume",
  audio_vol_up: "Increase the volume",
  audio_play: "Play",
  audio_stop: "Stop",
  audio_pause: "Pause",
  audio_prev: "Previous Track",
  audio_next: "Next Track",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
};

io.on("connection", (socket) => {
  console.log("user connected with socket id" + socket.id);
  socketsList.push(socket.id);
  socket.on("disconnect", function () {
    console.log("user disconnected");
    const currentSocketIndex = socketsList.indexOf(socket.id);
    if (currentSocketIndex != -1) {
      socketsList.splice(currentSocketIndex, 1);
    }
  });
  socket.on("coordinates", (coordinates) => {
    var mouse = robot.getMousePos();
    robot.moveMouse(mouse.x + coordinates.x, mouse.y + coordinates.y);
  });
  socket.on("clicks", (state) => {
    robot.mouseClick(state.finger, state.doubleTap);
  });
  socket.on("scroll", (coordinates) => {
    robot.scrollMouse(coordinates.x, coordinates.y);
  });
  socket.on("windowdragstart", () => {
    robot.mouseToggle("down");
  });
  socket.on("windowdragupdate", (coordinates) => {
    var mouse = robot.getMousePos();
    robot.dragMouse(mouse.x + coordinates.x, mouse.y + coordinates.y);
  });
  socket.on("windowdragend", () => {
    robot.mouseToggle("up");
  });
  socket.on("key", (key) => {
    try {
      if (key.length == 1) {
        let charCode = key.charCodeAt(0);
        if (
          (charCode >= 97 && charCode <= 122) ||
          (charCode >= 0 && charCode <= 9)
        ) {
          robot.keyTap(key);
        } else {
          robot.typeString(key);
        }
      } else {
        let lowercasedKey = key.toLowerCase();
        console.log(lowercasedKey);
        if (lowercasedKey == "backspace" || lowercasedKey == "enter") {
          robot.keyTap(lowercasedKey);
        } else {
          robot.typeString(key);
        }
      }
    } catch (e) {
      console.log(e);
    }
  });
  socket.on("media-key", (key) => {
    if (mediaKeys[key]) robot.keyTap(key);
  });

  socket.on("edit-key", (payload) => {
    try {
      robot.keyTap(payload.key, payload.modifier);
    } catch (e) {
      console.log(e);
    }
  });
  socket.on("text", (text) => {
    mainWindow.webContents.send("recieve-text", text);
  });

  socket.on("stop-screen-share", () => {
    socket.broadcast.emit("stop-screen-share");
  });

  // handlers for webrtc connection establisment
  socket.on("offer", (offer) => {
    if (offer) {
      offerServer = offer;
      socket.broadcast.emit("offer", offer);
    }
  });
  socket.on("offer-ice-candidate", (iceCandidate) => {
    socket.broadcast.emit("recieve-offer-ice-candidate", iceCandidate);
  });
  socket.on("answer-ice-candidate", (iceCandidate) => {
    socket.broadcast.emit("recieve-answer-ice-candidate", iceCandidate);
  });
  socket.on("answer", (answer) => {
    socket.broadcast.emit("answer", answer);
  });
});

server.listen(PORT, function () {
  serverRunning = true;
  console.log(`Listening on port ${PORT}`);
});
killable(server);

function getSocketsList() {
  return socketsList;
}
ipcMain.handle("get-sockets-list", getSocketsList);

function getServerAddress() {
  return results;
}

ipcMain.handle("get-server-address", getServerAddress);

function getAppVersion() {
  return app.getVersion();
}
ipcMain.handle("get-app-version", getAppVersion);

function getHostName() {
  return pcName;
}

ipcMain.handle("get-host-name", getHostName);

async function sendText(_event, text) {
  io?.emit("text-mobile", text);
}

ipcMain.handle("send-text", sendText);

async function copyText(_event, text) {
  if (text) {
    clipboard.writeText(text);
  }
}

ipcMain.handle("copy-text", copyText);

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 900,
    title: app.name,
    icon: __dirname + "/assets/icon.png",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: !app.isPackaged,
    },
  });
  // mainWindow.webContents.openDevTools();
  mainWindow.webContents.on("will-navigate", (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });
  desktopCapturer
    .getSources({ types: ["screen", "audio"] })
    .then(async (sources) => {
      for (const source of sources) {
        if (source.name.includes("Screen")) {
          mainWindow.webContents.send("SET_SOURCE_ID", source.id);
          return;
        }
      }
    });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "index.html"));
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

app.whenReady().then(() => {
  createWindow();
  const template = [
    {
      label: isMac ? app.name : "File",
      submenu: [isMac ? { role: "close" } : { role: "quit" }],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Updates",
          click: function () {
            shell.openExternal("https://peyara-remote-mouse.vercel.app");
          },
        },
        {
          label: "Github Source",
          click: function () {
            shell.openExternal(
              "https://github.com/ayonshafiul/peyara-mouse-server"
            );
          },
        },
        {
          label: "About",
          click: function () {
            dialog.showMessageBox(
              null,
              {
                title: "About",
                message: app.name,
                detail: `Version: ${app.getVersion()}\n Author: Shafiul Muslebeen`,
                buttons: ["OK"],
                type: "info",
              },
              () => {}
            );
          },
        },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
