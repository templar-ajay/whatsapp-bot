const { Client, LocalAuth } = require("whatsapp-web.js");
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const qrcode = require("qrcode-terminal");
const express = require("express");
const cors = require("cors");
const app = express();
const expressWs = require("express-ws")(app);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(function (req, res, next) {
  console.log("middleware");
  req.testing = "testing";

  return next();
});

app.get("/:clientId", (req, res) => {
  res.send("this api no longer words upgrade to ws");

  //   const { clientId } = req.params;
  //   createAndSaveClient(clientId)
  //     .then((data) =>
  //       res.send("client created and saved successfully. clientId: " + data)
  //     )
  //     .catch((err) => {
  //       console.log(
  //         "failed to create client, maybe the client is already created",
  //         err
  //       );
  //     });
});

app.ws("/authenticate", function (ws, req) {
  console.log("ws request received", ws);
  ws.on("message", function (msg) {
    console.log("message received from client", msg);
    const { command, clientId } = JSON.parse(msg);
    if (command == "createClient") {
      if (clientId?.length > 8) {
        // create a new client
        createAndSaveClient(clientId, ws)
          .then((clientId) => {
            console.log("clientID", clientId);
            ws.send(
              JSON.stringify({ state: "client-ready", clientId: clientId })
            );
          })
          .catch((err) => JSON.stringify({ result: "error", error: err }));
      }
    }
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

app.post("/re-auth", (req, res) => {
  const { clientId } = req.body;
  console.log("clientId", clientId);
  deleteClient(clientId)
    .then(() => {
      console.log("successfully deleted the client", clientId);
      res.send({ response: "success" });
    })
    .catch((err) => {
      console.log("unable to delete the client", clientId);
      res.send({ response: "success" });
    });
});

async function createAndSaveClient(clientId, ws) {
  console.log("creating client with clientId", clientId);
  return new Promise((clientReady, unableToCreateClient) => {
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: clientId }),
    });
    client.on("qr", (qr) => {
      // qrcode.generate(qr, { small: true });
      ws.send(JSON.stringify({ state: "qr-received", qr: qr }));
    });
    client.on("ready", () => {
      console.log("Client is ready!");
      clientReady(clientId);
      setTimeout(() => client.destroy(), 2000);
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

async function createClientAndSendMessage({ clientId, phoneNumber, messages }) {
  return new Promise((messageSent, errorSendingMessage) => {
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: clientId }),
    });
    client.on("qr", (qr) => {
      // qrcode.generate(qr, { small: true });
      console.log("please authenticate the server with your whatsapp first");
      errorSendingMessage(
        "please authenticate the server with your whatsapp first"
      );
      // if (client) client.destroy();
    });
    client.on("ready", () => {
      console.log("Client is ready!");

      sendMessage(client, phoneNumber, messages)
        .then((response) => {
          console.log(response);
          messageSent(response);
          // destroys the client to make space for next client;
          setTimeout(() => client.destroy(), 10000);
        })
        .catch((error) => {
          console.log(`failed to send message, error:`, error);
          errorSendingMessage(error);
        });
    });
    client.on("auth_failure", (err) => {
      console.log("auth_failure", err);
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

async function deleteClient(clientId) {
  // const clientId = client.options.authStrategy.clientId;
  // client.logout();
  // remove auth files from storage
  return new Promise(async (resolve, reject) => {
    //   setTimeout(() => {
    //     fs.rm(
    //       path.resolve(__dirname, `./.wwebjs_auth/session-${clientId}`),
    //       { recursive: true },
    //       (err) => {
    //         console.log(err ? reject(err) : resolve("file removed"));
    //       }
    //     );
    //   }, 500);
    resolve();
  });
}
