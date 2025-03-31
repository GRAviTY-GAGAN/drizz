const { App } = require("@slack/bolt");
const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
require("dotenv").config();

const app = express();
const PORT = 8080;

app.use(express.json());

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

(async () => {
  await slackApp.start();
  console.log("Slack bot started...");
})();

const slackChannel = process.env.SLACK_CHANNEL_ID;
const publicKey = process.env.APPETIZE_PUBLIC_KEY;

app.use(express.static(path.join(__dirname, "public")));

let ffmpegProcess = null;

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
    "-video_size",
    "1920x1080",
    "-framerate",
    "30",
    "-f",
    "gdigrab",
    "-i",
    "desktop",
    outputFilePath,
  ]);

  ffmpegProcess.stderr.on("data", (data) => {
    console.log(`FFmpeg log: ${data}`);
  });

  // Stop recording after 10 seconds
  // setTimeout(() => {
  //   console.log({ outputFilePath }, "outputFilePath------------1");
  //   stopRecording(outputFilePath);
  // }, 10000);
}

function stopRecording(outputFilePath) {
  if (ffmpegProcess) {
    console.log("Stopping recording...");

    // Since SIGINT is not working using 'q' to quit gracefully
    ffmpegProcess.stdin.write("q");
    ffmpegProcess.stdin.end();

    // Try graceful shutdown first
    // ffmpegProcess.kill("SIGINT");

    ffmpegProcess.on("exit", (code, signal) => {
      console.log(`FFmpeg process exited with code ${code}, signal: ${signal}`);

      if (code === 0) {
        const outputFilePath = path.join(__dirname, "recording.mp4");
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

  // dynamic import of open
  const open = (await import("open")).default;
  open("http://localhost:8080/index.html");

  await say("Launching emulator and recording...");

  // await startRecording();
});

slackApp.message(/ios eval/i, async ({ message, say }) => {
  console.log("Received ios test command. launching emulator...");
  await say("Launching ios emulator and recording...");

  const open = (await import("open")).default;
  open(
    "http://localhost:8080/index2.html",
  );
});

app.post("/emu-ready", async (req, res) => {
  console.log("EMU STARTED");
  await slackApp.client.chat.postMessage({
    channel: process.env.SLACK_CHANNEL_ID,
    text: "✅ Emulator is ready!",
  });
  res.send({});
});

app.post("/start-recording", async (req, res) => {
  startRecording();
  res.send({});
});

app.post("/stop-recording", async (req, res) => {
  stopRecording();
  res.send({});
});

app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
