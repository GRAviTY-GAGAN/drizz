document.addEventListener("DOMContentLoaded", async () => {
  const client = await window.appetize.getClient("#appetize");

  let session = client.startSession();

  client.on("session", async (res) => {
    try {
      console.log("App inside emulator is ready!");

      session = res;

      await fetch("http://localhost:8080/emu-ready", {
        method: "POST",
        body: "Emulator Ready",
        headers: {
          "Content-Type": "application/text",
        },
      });

      // Wait for app to open/initialize
      setTimeout(async () => {
        commandsToExecute(session);
      }, 3000);
    } catch (error) {
      console.error(error);
    }
  });
});

async function commandsToExecute(session) {
  try {
    if (!session) {
      console.error("Session is not initialized");
      return;
    }

    await fetch("http://localhost:8080/start-recording", {
      method: "POST",
      body: "Start Recording",
      headers: {
        "Content-Type": "application/text",
      },
    });

    await session.swipe({
      gesture: "right",
      element: {
        attributes: {
          accessibilityIdentifier: "Contacts",
        },
      },
    });

    await session.tap({
      element: {
        attributes: {
          accessibilityIdentifier: "Maps",
          accessibilityHint: "Double tap to open",
        },
      },
    });

    await session.tap({
      element: {
        attributes: {
          text: "Allow Once",
        },
      },
    });

    await session.tap({
      element: {
        attributes: {
          text: "Not Now",
        },
      },
    });

    await session.tap({
      element: {
        attributes: {
          text: "Continue",
        },
      },
    });

    await session.tap({
      element: {
        attributes: {
          accessibilityIdentifier: "MapsSearchTextField",
        },
      },
    });

    await session.type("Mysore");

    await session.tap({
      element: {
        attributes: {
          accessibilityIdentifier: "MapsSearchTextField",
        },
      },
    });

    console.log('Geting the screenshot to get the X,Y postion of search elemnt from omniparser and Gemini.')
    const result = await captureElementAndGetPosition(session, 'search');

    await session.tap({
      position: {
        x: `${result.result.x}%`,
        y: `${result.result.y}%`,
      },
    }).then((res) => {
      console.log('search BTN tap of omniparser and gemini successful ✅');
    }).catch((err) => {
      console.error('search BTN tap of omniparser and gemini FAILED ❌', err);
    });

    await session.tap({
      element: {
        attributes: {
          text: "Directions",
        },
      },
    });

    await session.type("Mandya");

    await session.tap({
      element: {
        attributes: {
          accessibilityIdentifier: "MapsSearchTextField",
        },
      },
    });

    await session.tap({
      position: {
        x: "85%",
        y: "88%",
      },
    });

    await fetch("http://localhost:8080/stop-recording", {
      method: "POST",
      body: "Stop Recording",
      headers: {
        "Content-Type": "application/text",
      },
    });
  } catch (error) {
    console.error(error);
    await fetch("http://localhost:8080/stop-recording", {
      method: "POST",
      body: "Stop Recording",
      headers: {
        "Content-Type": "application/text",
      },
    });
  }
}

async function captureElementAndGetPosition(session, element) {
  try {
    const screenshot = await session.screenshot("base64"); // Capture screenshot as base64

    // Convert base64 data to an image file
    const link = document.createElement("a");
    link.href = screenshot.data;
    link.download = "SSS.png";
    // link.click();

    const base64Data = screenshot.data.split(",")[1]; // Remove base64 prefix
    const blob = base64ToBlob(base64Data, "image/png"); // Convert to Blob

    console.log(`Blob size: ${blob.size} bytes (~${(blob.size / 1024).toFixed(2)} KB)`);

    const formData = new FormData();
    formData.append("image_file", blob, "screenshot.png");

    console.log({formData})

    const response = await fetch(`http://localhost:8080/screenshot?element=${element}`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    console.log("OmniParser Response:", result.omnidata, {result});
    return result;
  } catch (error) {
    console.error("Failed to capture & upload screenshot", error);
  }
}

// Helper function: Convert Base64 to Blob
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteArrays = [];
  
  for (let i = 0; i < byteCharacters.length; i += 512) {
    const slice = byteCharacters.slice(i, i + 512);
    const byteNumbers = new Array(slice.length);

    for (let j = 0; j < slice.length; j++) {
      byteNumbers[j] = slice.charCodeAt(j);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mimeType });
}
