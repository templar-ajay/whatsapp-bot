const { Client, LocalAuth } = require("whatsapp-web.js");
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const qrcode = require("qrcode-terminal");
const express = require("express");
const app = express();
app.use(express.json());

app.get("/:clientId", (req, res) => {
  const { clientId } = req.params;
  createAndSaveClient(clientId)
    .then((data) =>
      res.send("client created and saved successfully. clientId: " + data)
    )
    .catch((err) => {
      console.log(
        "failed to create client, maybe the client is already created",
        err
      );
    });
});
app.post("/send-message", (req, res) => {
  const { clientId, phoneNumber, ...rest } = req?.body?.customData;
  const messages = extractMessages(rest);

  if (!(clientId && phoneNumber && messages.length))
    res.send("data insufficient to make a send message request");
  console.log("received message request for client:", clientId);
  createClientAndSendMessage({
    clientId: clientId,
    phoneNumber: phoneNumber,
    messages: messages,
  })
    .then((data) => res.send(data))
    .catch((err) => res.send(err));
});
app.listen(8080, () => {
  console.log("server connected to port 8080");
});
async function createClientAndSendMessage({ clientId, phoneNumber, messages }) {
  return new Promise((messageSent, errorSendingMessage) => {
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: clientId }),
    });
    client.on("qr", (qr) => {
      qrcode.generate(qr, { small: true });
    });
    client.on("ready", () => {
      console.log("Client is ready!");
      sendMessage(client, phoneNumber, messages)
        .then((response) => {
          console.log(response);
          messageSent(response);
          // destroys the client to make space for next client;
          setTimeout(() => client.destroy(), 1000);
        })
        .catch((error) => {
          console.log(`failed to send message, error:`, error);
          errorSendingMessage(error);
        });
    });
    client.on("disconnected", () => {
      console.log("client has disconnected");
      setTimeout(() => {
        fs.rm(
          path.resolve(
            __dirname,
            `./.wwebjs_auth/session-${client.options.authStrategy.clientId}`
          ),
          { recursive: true },
          (err) => {
            console.log(err ? err : "file removed");
          }
        );
      }, 500);
    });

    client.initialize();
  });
}
async function createAndSaveClient(clientId) {
  console.log("creating client with clientId", clientId);
  return new Promise((clientReady, unableToCreateClient) => {
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: clientId }),
    });
    client.on("qr", (qr) => {
      qrcode.generate(qr, { small: true });
    });
    client.on("ready", () => {
      console.log("Client is ready!");
      clientReady(clientId);
      setTimeout(() => client.destroy(), 1000);
    });
    client.on("disconnected", () => {
      console.log("client has disconnected");
      setTimeout(() => {
        fs.rm(
          path.resolve(
            __dirname,
            `./.wwebjs_auth/session-${client.options.authStrategy.clientId}`
          ),
          { recursive: true },
          (err) => {
            console.log(err ? err : "file removed");
          }
        );
      }, 500);
    });

    client.initialize();
  });
}
async function sendMessage(
  client,
  phoneNumber = "918696260393",
  messages = ["Jai Shree Ram"]
) {
  return new Promise((messageSent, err) => {
    const filtered = messages.filter((message) => message);
    client
      ?.sendMessage(`${phoneNumber}@c.us`, filtered[random(0, filtered.length)])
      .then((response) => {
        messageSent(response);
      })
      .catch((error) => {
        err(error);
      });
  });
}
function random(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
function extractMessages(rest) {
  return Object.keys(rest)
    .filter((x) => x.includes("message"))
    .map((x) => rest[x]);
}
