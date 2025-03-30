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

  await session.tap({
    element: {
      attributes: {
        "resource-id": "android.widget.todo-input",
      },
    },
  });

  await session.type("Add Test Todo 1");

  await session.tap({
    element: {
      attributes: {
        "resource-id": "add-todo-btn",
      },
    },
  });

  await session.tap({
    element: {
      attributes: {
        "resource-id": "android:id/button1",
      },
    },
  });

  await session.tap({
    element: {
      attributes: {
        text: "Todos",
      },
    },
  });

  await session.tap({
    element: {
      attributes: {
        text: "Add Todo",
      },
    },
  });

  await fetch("http://localhost:8080/stop-recording", {
    method: "POST",
    body: "Stop Recording",
    headers: {
      "Content-Type": "application/text",
    },
  });
}
