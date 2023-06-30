require("dotenv").config();
const port = process.env.PORT;
let messageForClient = "";
let wsConnection;
let theClient;

function sendMessage(
  client,
  phoneNumber = "918696260393",
  message = "Jai Shree Ram"
) {
  /**
   * Replace <recipient-phone-number> with the actual phone number of the recipient (including the country code but excluding any leading zeros or plus sign).
   */
  // const phoneNumber = "916283758935";
  // const message = "Hello, world!";

  client
    ?.sendMessage(`${phoneNumber}@c.us`, message)
    .then((response) => {
      console.log("Message sent:", response);
    })
    .catch((error) => {
      console.error("Error sending message:", error);
    });
}
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
  const { phoneNumber, message } = req.body;
  console.log(
    "received a request to send message- '" + message + "' to phone number",
    phoneNumber
  );
  if (theClient) {
    sendMessage(theClient, phoneNumber, message);
    res.send(`message ${message} sent to ${phoneNumber}`);
  }
});

app.ws("/", function (ws, req) {
  wsConnection = ws;
  ws.on("message", function (msg) {
    console.log("message received from client");
    ws.send(messageForClient);
  });

  console.log("socket", req.testing);
});

app.listen(port, () => {
  console.log("server running at http://localhost:" + port);

  const { Client, LocalAuth } = require("whatsapp-web.js");
  const client = new Client({
    puppeteer: {
      args: ["--no-sandbox"],
    },
    authStrategy: new LocalAuth({
      clientId: "test1",
    }),
  });

  client.on("qr", (qr) => {
    messageForClient = qr;
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

  client.initialize();
});
