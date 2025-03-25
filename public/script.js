document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch("https://api.appetize.io/v2/sessions", {
            method: "POST",
            headers: {
                Authorization: `Basic ${btoa("tok_4y4eraffywwuwvhzhrvjq42duq:")}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                publicKey: "b_qwidbqs6q4cuf3debrzvfyc5si",
                device: "iphone13pro",
                osVersion: "15.0",
                timeout: 300,
            }),
        });

        const data = await response.json();
        if (data.url) {
            window.open(data.url, "_blank"); // Opens emulator in a new tab
        } else {
            console.error("Failed to start session:", data);
        }
    } catch (error) {
        console.error("Error starting Appetize session:", error);
    }
});
