/**
 * Installation script for SQLite VSS extension
 * This script helps install and configure the SQLite VSS extension
 * for vector similarity search in SQLite
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Determine platform and architecture
const platform = os.platform();
const arch = os.arch();

console.log(`Detected platform: ${platform}, architecture: ${arch}`);

// Determine package name based on platform
let packageName;
if (platform === "darwin") {
  if (arch === "x64") {
    packageName = "@sqlite-vss/darwin-x64";
  } else if (arch === "arm64") {
    packageName = "@sqlite-vss/darwin-arm64";
  }
} else if (platform === "linux") {
  if (arch === "x64") {
    packageName = "@sqlite-vss/linux-x64";
  } else if (arch === "arm64") {
    packageName = "@sqlite-vss/linux-arm64";
  }
} else if (platform === "win32") {
  packageName = "@sqlite-vss/windows-x64";
}

if (!packageName) {
  console.error(`Unsupported platform/architecture: ${platform}/${arch}`);
  console.log(
    "Please manually install SQLite VSS from https://github.com/asg017/sqlite-vss"
  );
  process.exit(1);
}

// Install the VSS extension
try {
  console.log(`Installing ${packageName}...`);
  execSync(`npm install ${packageName} --save`, { stdio: "inherit" });
  console.log("✅ SQLite VSS extension installed successfully");

  // Get the path to the installed extension
  try {
    const extensionPath = require.resolve(`${packageName}/vss0`);
    console.log(`Extension located at: ${extensionPath}`);

    // Create a configuration file for the extension path
    const configPath = path.join(__dirname, "vss-config.json");
    fs.writeFileSync(configPath, JSON.stringify({ extensionPath }, null, 2));
    console.log(`✅ Created configuration file at ${configPath}`);

    // Update database.js to use the extension path
    updateDatabaseFile(extensionPath);

    console.log("\n🎉 Installation complete!");
    console.log("\nNext steps:");
    console.log("1. Restart your application: npm start");
    console.log("2. Run the migration script: node data/migrate-to-vector.js");
  } catch (error) {
    console.error("Error locating extension path:", error);
    console.log(
      "Please update server/data/database.js manually with the correct extension path"
    );
  }
} catch (error) {
  console.error("Error installing SQLite VSS extension:", error);
  process.exit(1);
}

function updateDatabaseFile(extensionPath) {
  const dbFilePath = path.join(__dirname, "data", "database.js");

  try {
    let content = fs.readFileSync(dbFilePath, "utf8");

    // Replace the extension loading line with the correct path
    const loadExtensionRegex = /db\.run\("SELECT load_extension\('([^']+)'\);/;

    if (loadExtensionRegex.test(content)) {
      content = content.replace(
        loadExtensionRegex,
        `db.run("SELECT load_extension('${extensionPath.replace(
          /\\/g,
          "\\\\"
        )}');`
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
