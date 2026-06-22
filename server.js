const express = require("express");
const stompit = require("stompit");
const async = require("async");
const WebSocket = require("ws");
require("dotenv").config();

const app = express();

app.use(express.static("public"));

app.listen(3000, () => {
    console.log("Listening on port 3000");
});

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", ws => {
    console.log("Browser connected");
});

const username = process.env.CLIENT_USERNAME;
const password = process.env.CLIENT_PASSWORD;

const connectOptions = {
    host: "publicdatafeeds.networkrail.co.uk",
    port: 61618,
    connectHeaders: {
        "heart-beat": "15000,15000",// heart-beat of 15 seconds
        "client-id": username,      // request a durable subscription - set this to the login name you use to subscribe
        host: "/",
        login: username,
        passcode: password   
    }
};

const reconnectOptions = {
    initialReconnectDelay: 10,    // milliseconds delay of the first reconnect
    maxReconnectDelay: 30000,     // maximum milliseconds delay of any reconnect
    useExponentialBackOff: true,  // exponential increase in reconnect delay
    maxReconnects: 30,            // maximum number of failed reconnects consecutively
    randomize: false              // randomly choose a server to use when reconnecting
                                  // (there are no other servers at this time)    
};

const connectionManager = 
    new stompit.ConnectFailover([connectOptions], reconnectOptions);

connectionManager.connect(function (error, client, reconnect) {
    if (error) {
        console.log("Terminal error, gave up reconnecting");
        return;
    }

    client.on("error", function (error) {
        console.log("Connection lost. Reconnecting...");
        reconnect();
    });
    const headers = {
        destination: "/topic/TRAIN_MVT_ALL_TOC",           // subscribe for a destination to which messages are sent
        "activemq.subscriptionName": "somename-train_mvt", // request a durable subscription - set this to an unique string for each feed
        ack: "client-individual"                           // the client will send ACK frames individually for each message processed
    };
    
    client.subscribe(headers, function (error, message) {
        if (error) {
            console.log("Subscription failed:", error.message);
            return;
        }
        message.readString("utf-8", function (error, body) {
            if (error) {
                console.log("Failed to read a message", error);
                return;
            }
            if (body) {
                let data;
                try {
                    data = JSON.parse(body);
                } catch (e) {
                    console.log("Failed to parse JSON", e);
                    return;
                }
                async.each(data,
                    function(item, next) {
                        // Look for Train Activation messages (msg_type 0001)
                        if (item.header && item.header.msg_type === "0001") {
                            // console.log(
                            //     "Train", 
                            //     item.body.train_id, 
                            //     "movement", 
                            //     item.body.tp_origin_stanox ? item.body.tp_origin_stanox : item.body.sched_origin_stanox
                            // );
                            const trainMessage = {
                                trainId: item.body.train_id,
                                stanox: item.body.tp_origin_stanox
                            };

                            wss.clients.forEach(client => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify(trainMessage));
                                }
                            });
                        }
                        next();
                    }
                );
            }
            client.ack(message); // Send ACK frame to server
        });
    });
});