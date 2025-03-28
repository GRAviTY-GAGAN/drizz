const { App } = require("@slack/bolt");
const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const puppeteer = require("puppeteer");
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

let ffmpegProcess = null;

async function startEmulatorSession() {
  const emulatorURL = `https://appetize.io/app/${publicKey}?device=pixel7&osVersion=13.0&toolbar=true&autoplay=true&embed=true`;
  console.log("Opening emulator:", emulatorURL);

  const open = (await import("open")).default;
  await open(emulatorURL);

  // Wait 5 seconds before starting recording to open and start emulator on appetize
  setTimeout(startRecording, 5000);
}

function startRecording() {
  console.log("Starting screen recording...");
  const outputFilePath = path.join(__dirname, "recording.mp4");

  // Check if FFmpeg is installed
  spawn("ffmpeg", ["-version"]).on("error", (err) => {
    console.error("FFmpeg is not installed or not in PATH:", err);
    return;
  });

  ffmpegProcess = spawn("ffmpeg", [
    "-y",
    "-video_size", "1920x1080",
    "-framerate", "30",
    "-f", "gdigrab",
    "-i", "desktop",
    outputFilePath
  ]);

  ffmpegProcess.stderr.on("data", (data) => {
    console.log(`FFmpeg log: ${data}`);
  });

  // ffmpegProcess.on("close", (code) => {
  //   console.log(`Recording stopped with exit code ${code}`);
  //   if (code === 0) uploadRecordingToSlack(outputFilePath);
  // });

  // Recording for 20 seconds
  setTimeout(() => stopRecording(outputFilePath), 20000);
}

function stopRecording(outputFilePath) {
  if (ffmpegProcess) {
    console.log("Stopping recording...");

    // Since SIGINT is not working using 'q' to quit gracefully
    ffmpegProcess.stdin.write('q');
    ffmpegProcess.stdin.end();
    
    // Try graceful shutdown first
    // ffmpegProcess.kill("SIGINT");

    ffmpegProcess.on("exit", (code, signal) => {
      console.log(`FFmpeg process exited with code ${code}, signal: ${signal}`);

      if (code === 0) {
        console.log("FFmpeg exited cleanly. Uploading to Slack...");
        uploadRecordingToSlack(outputFilePath);
      } else {
        console.error("FFmpeg did not exit cleanly.");
      }

      // Only set to null after exit event
      ffmpegProcess = null;
    });

    // If FFmpeg doesn’t exit in 3 seconds, force stop it
    setTimeout(() => {
      if (ffmpegProcess) {
        console.log("Force stopping FFmpeg...");
        ffmpegProcess.kill("SIGTERM");
      }
    }, 3000);
  } else {
    console.log("No recording process found.");
  }
}


async function uploadRecordingToSlack(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      return;
    }

    console.log("Uploading recording to Slack...");
    const response = await slackApp.client.files.uploadV2({
      channel_id: slackChannel,
      file: fs.createReadStream(filePath),
      filename: "recording.mp4",
      title: "Emulator Recording",
    });

    // console.log("Slack API Response:", JSON.stringify(response, null, 2));

    if (response.ok) {
      console.log("✅ Recording successfully uploaded to Slack!");
    } else {
      console.error("❌ Slack upload failed:", response.error);
    }
  } catch (error) {
    console.error("Error uploading file to Slack:", error.data);
  }
}

function sendJSCommand(jsCode) {
  const emulatorWindow = document.getElementById("appetize-iframe").contentWindow;
  emulatorWindow.postMessage(
    {
      type: "javascript",
      code: jsCode,
    },
    "*"
  );
}


slackApp.message(/test/i, async ({ message, say }) => {
  console.log("Received 'test' command. Launching emulator...");
  await startEmulatorSession();
  await say("Launching emulator and recording...");
});

slackApp.message(/demo/i, async ({ message, say }) => {
  console.log("Received 'demo' command. Launching emulator...");

  automateAppetize().catch((err) => console.error(err));

  // await startEmulatorSession();
  // await say("Launching emulator... Please wait.");

  // // Wait 5 seconds for the emulator to load the app
  // setTimeout(() => {
  //   console.log("Performing automated steps in the app...");

  //   // 1️⃣ Type "Test Todo" in the input field
  //   sendJSCommand(`
  //     var input = document.querySelector('input[type="text"]');
  //     if (input) {
  //       input.value = "Test Todo";
  //       var event = new Event('input', { bubbles: true });
  //       input.dispatchEvent(event);
  //       console.log('Entered text in Add Todo input');
  //     } else {
  //       console.log('❌ Input field not found');
  //     }
  //   `);

  //   // 2️⃣ Click the "Add Todo" button
  //   setTimeout(() => {
  //     sendJSCommand(`
  //       var addButton = document.querySelector('button');
  //       if (addButton) {
  //         addButton.click();
  //         console.log('Clicked Add Todo button');
  //       } else {
  //         console.log('❌ Add Todo button not found');
  //       }
  //     `);
  //   }, 2000);

  //   // 3️⃣ Click "OK" on the alert popup
  //   setTimeout(() => {
  //     sendJSCommand(`
  //       if (window.alert) {
  //         window.alert = function() {
  //           console.log('Intercepted alert popup');
  //           var okButton = document.querySelector('button:contains("OK")');
  //           if (okButton) {
  //             okButton.click();
  //             console.log('Clicked OK button on alert');
  //           } else {
  //             console.log('❌ OK button not found');
  //           }
  //         };
  //       }
  //     `);
  //   }, 4000);

  // }, 5000);
});

async function automateAppetize() {
  const appetizeURL = `https://appetize.io/app/${process.env.APPETIZE_PUBLIC_KEY}?device=pixel7&osVersion=13.0&autoplay=true`;
  console.log("🚀 Launching Puppeteer...");
  
  const browser = await puppeteer.launch({ headless: false }); // Set to true for headless mode
  const page = await browser.newPage();

  console.log("🌐 Opening Appetize emulator...");
  await page.goto(appetizeURL, { waitUntil: "networkidle2" });

  console.log("⏳ Waiting for emulator to load...");
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for the emulator to initialize

  // 🔍 Click on the input field (update selector if needed)
  console.log("🖱 Clicking on input field...");
  await page.click("input"); 

  // ⌨️ Type "Test Todo"
  console.log("⌨️ Typing 'Test Todo'...");
  await page.type("input", "Test Todo");

  // 🖱 Click on "Add Todo" button (update selector if needed)
  console.log("🖱 Clicking 'Add Todo' button...");
  await page.click("button#add-todo"); // Adjust selector if necessary

  // ⏳ Wait for alert to appear
  console.log("⏳ Waiting for alert...");
  await page.waitForTimeout(2000);

  // 🖱 Click on "OK" button in alert
  console.log("🖱 Clicking 'OK'...");
  page.on("dialog", async (dialog) => {
    await dialog.accept();
    console.log("✅ Alert closed.");
  });

  // 📸 Take a screenshot
  console.log("📸 Taking screenshot...");
  await page.screenshot({ path: "result.png" });

  console.log("✅ Automation complete!");
  await browser.close();
}

(async () => {
  await slackApp.start();
  console.log("Slack bot is running!");
})();
