/**
 * Alternative installation script for SQLite VSS extension
 * This script helps install and configure the SQLite VSS extension
 * by downloading it directly from GitHub
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");

// Determine platform and architecture
const platform = os.platform();
const arch = os.arch();
console.log(`Detected platform: ${platform}, architecture: ${arch}`);

// Determine download URLs and file names
let downloadUrl;
let downloadFileName;
let extensionFileName;

if (platform === "darwin") {
  if (arch === "arm64") {
    // For M1/M2 Macs (Apple Silicon)
    downloadUrl =
      "https://github.com/asg017/sqlite-vss/releases/download/v0.1.1/sqlite-vss-v0.1.1-devel-macos-arm64.tar.gz";
    downloadFileName = "sqlite-vss-macos-arm64.tar.gz";
    extensionFileName = "vss0.dylib";
  } else {
    // For Intel Macs
    downloadUrl =
      "https://github.com/asg017/sqlite-vss/releases/download/v0.1.1/sqlite-vss-v0.1.1-devel-macos-x86_64.tar.gz";
    downloadFileName = "sqlite-vss-macos-x86_64.tar.gz";
    extensionFileName = "vss0.dylib";
  }
} else if (platform === "linux") {
  downloadUrl =
    "https://github.com/asg017/sqlite-vss/releases/download/v0.1.1/sqlite-vss-v0.1.1-devel-linux-x86_64.tar.gz";
  downloadFileName = "sqlite-vss-linux-x86_64.tar.gz";
  extensionFileName = "vss0.so";
} else if (platform === "win32") {
  downloadUrl =
    "https://github.com/asg017/sqlite-vss/releases/download/v0.1.1/sqlite-vss-v0.1.1-devel-windows-x86_64.zip";
  downloadFileName = "sqlite-vss-windows-x86_64.zip";
  extensionFileName = "vss0.dll";
} else {
  console.error(`Unsupported platform: ${platform}`);
  process.exit(1);
}

// Create directories
const extensionsDir = path.join(__dirname, "extensions");
if (!fs.existsSync(extensionsDir)) {
  fs.mkdirSync(extensionsDir, { recursive: true });
}

// Download and extract the extension
const downloadPath = path.join(extensionsDir, downloadFileName);
const extensionPath = path.join(extensionsDir, extensionFileName);

console.log(`Downloading SQLite VSS extension from ${downloadUrl}...`);

// Download the file
const file = fs.createWriteStream(downloadPath);
https
  .get(downloadUrl, (response) => {
    if (response.statusCode !== 200) {
      console.error(
        `Failed to download: ${response.statusCode} ${response.statusMessage}`
      );
      fs.unlinkSync(downloadPath);
      process.exit(1);
    }

    response.pipe(file);

    file.on("finish", () => {
      file.close();
      console.log("Download completed, extracting...");

      try {
        // Extract the archive
        const extractDir = path.join(extensionsDir, "temp");
        if (!fs.existsSync(extractDir)) {
          fs.mkdirSync(extractDir, { recursive: true });
        }

        if (downloadFileName.endsWith(".zip")) {
          // Extract zip file
          execSync(`unzip -o "${downloadPath}" -d "${extractDir}"`, {
            stdio: "inherit",
          });
        } else {
          // Extract tar.gz file
          execSync(`tar -xzf "${downloadPath}" -C "${extractDir}"`, {
            stdio: "inherit",
          });
        }

        console.log("Extraction completed, finding extension file...");

        // Find the extension file recursively
        function findExtensionFile(dir, fileName) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
              const found = findExtensionFile(filePath, fileName);
              if (found) return found;
            } else if (file === fileName) {
              return filePath;
            }
          }
          return null;
        }

        const foundExtensionPath = findExtensionFile(
          extractDir,
          extensionFileName
        );

        if (!foundExtensionPath) {
          console.error(
            `Could not find ${extensionFileName} in the extracted files`
          );
          process.exit(1);
        }

        // Copy the extension file to the extensions directory
        fs.copyFileSync(foundExtensionPath, extensionPath);
        console.log(`Extension file copied to ${extensionPath}`);

        // Clean up
        try {
          fs.rmSync(extractDir, { recursive: true, force: true });
          fs.unlinkSync(downloadPath);
        } catch (error) {
          console.warn(
            "Warning: Could not clean up temporary files:",
            error.message
          );
        }

        // Update configuration
        const configPath = path.join(__dirname, "vss-config.json");
        fs.writeFileSync(
          configPath,
          JSON.stringify({ extensionPath }, null, 2)
        );
        console.log(`Created configuration file at ${configPath}`);

        // Try to update the database.js file
        updateDatabaseFile(extensionPath);

        console.log("\n🎉 Installation complete!");
        console.log("\nNext steps:");
        console.log("1. Restart your application: npm start");
        console.log(
          "2. Run the migration script: node data/migrate-to-vector.js"
        );
      } catch (error) {
        console.error("Error extracting or setting up extension:", error);
        process.exit(1);
      }
    });
  })
  .on("error", (error) => {
    fs.unlinkSync(downloadPath);
    console.error("Error downloading extension:", error.message);
    process.exit(1);
  });

function updateDatabaseFile(extensionPath) {
  const dbFilePath = path.join(__dirname, "data", "database.js");

  try {
    let content = fs.readFileSync(dbFilePath, "utf8");

    // Replace the extension loading line with the correct path
    const loadExtensionRegex = /db\.run\(`SELECT load_extension\('([^']+)'\)`/;

    if (loadExtensionRegex.test(content)) {
      content = content.replace(
        loadExtensionRegex,
        `db.run(\`SELECT load_extension('${extensionPath.replace(
          /\\/g,
          "\\\\"
        )}')\``
      );

      fs.writeFileSync(dbFilePath, content);
      console.log("✅ Updated database.js with correct extension path");
    } else {
      console.warn("Could not find extension loading line in database.js");
      console.log(
        "Please manually update the extension path in server/data/database.js"
      );
    }
  } catch (error) {
    console.error("Error updating database.js:", error);
    console.log(
      "Please manually update the extension path in server/data/database.js"
    );
  }
}
