const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");
module.exports = function withAppIcon(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const iconsetPath = path.join(
        config.modRequest.platformProjectRoot,
        "Orbital",
        "Images.xcassets",
        "AppIcon.appiconset"
      );
      const contents = {
        images: [
          {
            filename: "AppIcon.png",
            idiom: "universal",
            platform: "ios",
            size: "1024x1024",
          },
        ],
        info: { author: "xcode", version: 1 },
      };
      fs.writeFileSync(
        path.join(iconsetPath, "Contents.json"),
        JSON.stringify(contents, null, 2)
      );
      const src = path.join(config.modRequest.projectRoot, "assets", "AppIcon.png");
      const dest = path.join(iconsetPath, "AppIcon.png");
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
      return config;
    },
  ]);
};
