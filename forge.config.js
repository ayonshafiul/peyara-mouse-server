const path = require("path");
const fs = require("node:fs/promises");

module.exports = {
  packagerConfig: {
    asar: true,
    icon: "./src/assets/icon", // no file extension required
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        authors: "Shafiul Muslebeen",
        description: "Peyar Server",
        setupIcon: "./src/assets/icon.ico",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        options: {
          bin: "PeyaraRemoteMouseServer",
          icon: "./src/assets/icon.png",
        },
        packagerConfig: {
          executableName: "peyara-server",
        },
      },
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
  ],
  hooks: {
    packageAfterPrune: async (_config, buildPath) => {
      const gypPath = path.join(
        buildPath,
        "node_modules",
        "moduleName",
        "build",
        "node_gyp_bins"
      );
      await fs.rm(gypPath, { recursive: true, force: true });
    },
  },
};
