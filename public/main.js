const socket = new WebSocket("ws://localhost:8080");

socket.addEventListener("message", event => {

    const data = JSON.parse(event.data);

    const div = document.createElement("div");

    div.textContent =
        `Train ${data.trainId} activated at stanox ${data.stanox}`;

    document.getElementById("messages")
        .appendChild(div);
});