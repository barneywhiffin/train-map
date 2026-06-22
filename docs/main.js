const socketUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'ws://localhost:3000'
    : 'wss://train-map-yp39.onrender.com';

// need to deploy websocket server to the cloud for this to work....

const socket = new WebSocket(socketUrl);

socket.onopen = () => {
    console.log(`Connected to WebSocket at: ${socketUrl}`);
};

socket.addEventListener("message", event => {

    const data = JSON.parse(event.data);

    const div = document.createElement("div");

    div.textContent =
        `Train ${data.trainId} activated at stanox ${data.stanox}`;

    document.getElementById("messages")
        .appendChild(div);
});