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
} = require("electron");
const killable = require("killable");
const path = require("path");
let robot = require("@jitsi/robotjs");
const expressServer = require("express")();
const { networkInterfaces, hostname } = require("os");
const server = require("http").createServer(expressServer);
const io = require("socket.io")(server);

const isMac = process.platform === "darwin";
let serverRunning = false;
const nets = networkInterfaces();
const pcName = hostname();
const results = {};
const port = 1313;

for (const name of Object.keys(nets)) {
  console.log(name);
  for (const net of nets[name]) {
    // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
    // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6

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

robot.setMouseDelay(2);
io.on("connection", (socket) => {
  console.log("user connected with socket id" + socket.id);
  socket.on("disconnect", function () {
    console.log("user disconnected");
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
});

function toggleServer() {
  if (!serverRunning) {
    server.listen(port, function () {
      serverRunning = true;
      console.log(`Listening on port ${port}`);
    });
  } else {
    server.kill(() => {
      serverRunning = false;
    });
  }
}
killable(server);
ipcMain.handle("toggle-server", toggleServer);

function isServerOn() {
  return serverRunning;
}

ipcMain.handle("is-server-on", isServerOn);

function getServerAddress() {
  return results;
}

ipcMain.handle("get-server-address", getServerAddress);

function getHostName() {
  return pcName;
}

ipcMain.handle("get-host-name", getHostName);

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: __dirname + "/assets/icon.png",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: !app.isPackaged,
    },
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
