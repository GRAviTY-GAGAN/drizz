const { App } = require("@slack/bolt");
const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const puppeteer = require("puppeteer");
const adb = require("adbkit");
require("dotenv").config();

const app = express();
const PORT = 3000;

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

const slackChannel = process.env.SLACK_CHANNEL_ID;
const publicKey = process.env.APPETIZE_PUBLIC_KEY;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

async function startAdbTunnel() {
  console.log("Starting ADB Tunnel...");
  const tunnelCommand = "ssh -R 5037:localhost:5037 tunnel@appetize.io";

  const adbTunnel = spawn("cmd.exe", ["/c", tunnelCommand], { shell: true });

  adbTunnel.stdout.on("data", (data) => console.log(`ADB Tunnel: ${data}`));
  adbTunnel.stderr.on("data", (data) => console.error(`ADB Tunnel Error: ${data}`));

  setTimeout(() => connectToAdb(), 5000); // Give some time for the tunnel to establish
}

async function connectToAdb() {
  const client = adb.createClient();

  client.listDevices().then((devices) => {
    if (devices.length === 0) {
      console.error("No devices found!");
      return;
    }

    const deviceId = devices[0].id;
    console.log(`Connected to ADB device: ${deviceId}`);

    // Automate tap & text input
    client.shell(deviceId, "input tap 500 1000");
    client.shell(deviceId, "input text 'Test Todo'");
  });
}

async function startEmulatorSession() {
  const emulatorURL = `https://appetize.io/app/${publicKey}?device=pixel7&osVersion=13.0&toolbar=true&autoplay=true&embed=true&enableAdb=true`;
  console.log("Opening emulator:", emulatorURL);

  const open = (await import("open")).default;
  await open(emulatorURL);

  setTimeout(startAdbTunnel, 5000); // Wait for emulator to start before enabling ADB
}

slackApp.message(/test/i, async ({ message, say }) => {
  console.log("Received 'test' command. Launching emulator...");
  await startEmulatorSession();
  await say("Launching emulator and enabling ADB...");
});

(async () => {
  await slackApp.start();
  console.log("Slack bot is running!");
})();
