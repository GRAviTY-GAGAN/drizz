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

    await session.tap({
      position: {
        x: "85%",
        y: "88%",
      },
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
  }
}
