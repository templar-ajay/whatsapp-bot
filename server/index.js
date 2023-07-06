require("dotenv").config();
const { Client } = require("whatsapp-web.js");

const port = process.env.PORT;
let messageForClient = "";
let wsConnection;
let theClient;

const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
require("express-ws")(app);

app.use(function (req, res, next) {
  console.log("middleware");
  req.testing = "testing";
  return next();
});

app.get("/", function (req, res, next) {
  console.log("get route", req.testing);
  res.end();
});
app.post("/send-message", (req, res) => {
  const {
    phoneNumber,
    message1,
    message2,
    message3,
    message4,
    message5,
    message6,
    message7,
    message8,
    message9,
    message10,
  } = req.body?.customData;
  console.log("request received", req.body?.customData);
  if (theClient) {
    if (phoneNumber && message1) {
      const formattedPhoneNumber = phoneNumber
        .replaceAll("+", "")
        .replaceAll(" ", "");
      sendMessage(theClient, formattedPhoneNumber, [
        message1,
        message2,
        message3,
        message4,
        message5,
        message6,
        message7,
        message8,
        message9,
        message10,
      ]);
      res.send(`messages sent to ${phoneNumber}`);
    } else
      res.send(
        "failed to send message, please check if you are sending the data in JSON format {customData:{phoneNumber:'+91 8696260393',message:'the message'}} in body of a POST request."
      );
  } else {
    res.send("client is not ready yet");
  }
});

app.ws("/", function (ws, req) {
  wsConnection = ws;
  ws.on("message", function (msg) {
    console.log("message received from client");
    ws.send(messageForClient);
    wsConnection = ws;
  });

  console.log("socket", req.testing);
});

app.listen(port, () => {
  console.log("server running at http://localhost:" + port);
  createClient();
});
function createClient() {
  const client = new Client({
    puppeteer: {
      args: ["--no-sandbox"],
    },
  });

  client.on("qr", (qr) => {
    messageForClient = qr;
    if (wsConnection) wsConnection.send(messageForClient);
    console.log("qr", qr);
  });

  client.on("ready", () => {
    console.log("Client is ready!");
    theClient = client;
    messageForClient = "Client is ready!";
    if (wsConnection) {
      wsConnection.send(messageForClient);
    }
  });

  client.on("message", (message) => {
    if (message.body === "!ping") {
      message.reply("pong");
    }
  });

  client.on("disconnected", (reason) => {
    console.log("Disconnected:", reason);
    theClient = false; // to stop sending message functionality
    createClient();
  });

  client.initialize();
}

function sendMessage(
  client,
  phoneNumber = "918696260393",
  messages = ["Jai Shree Ram"]
) {
  const filtered = messages.filter((message) => message);

  client
    ?.sendMessage(`${phoneNumber}@c.us`, filtered[random(0, filtered.length)])
    .then((response) => {
      console.log("Message sent:", response);
    })
    .catch((error) => {
      console.error("Error sending message:", error);
    });
}
function random(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
