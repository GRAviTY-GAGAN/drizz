const { App } = require("@slack/bolt");
const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
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
  const emulatorURL = `https://appetize.io/app/${publicKey}?device=pixel7&osVersion=13.0&toolbar=true&autoplay=true`;
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


slackApp.message(/test/i, async ({ message, say }) => {
  console.log("Received 'test' command. Launching emulator...");
  await startEmulatorSession();
  await say("Launching emulator and recording...");
});

(async () => {
  await slackApp.start();
  console.log("Slack bot is running!");
})();
