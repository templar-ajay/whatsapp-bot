const { Client, LocalAuth } = require("whatsapp-web.js");
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const expressWs = require("express-ws")(app);

const clientsObj = {};

app.use(function (req, res, next) {
  console.log("request received");
  req.testing = "testing";

  return next();
});

app.ws("/authenticate", function (ws, req) {
  console.log("ws request received");
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
          .catch((err) => {
            console.log("unable to create client, reason:", err);
            JSON.stringify({ result: "error", error: err });
          });
      }
    }
  });
});

app.post("/send-message", (req, res) => {
  const { secret: clientId, phoneNumber, ...rest } = req?.body?.customData;
  const messages = extractMessages(rest);

  if (!(clientId && phoneNumber && messages.length))
    res.send("data insufficient to make a send message request");
  console.log("received message request for client:", clientId);
  // createClientAndSendMessage({
  //   clientId: clientId,
  //   phoneNumber: phoneNumber,
  //   messages: messages,
  // })
  //   .then((data) => res.send(data))
  //   .catch((err) => res.send(err));
  sendMessage(clientsObj[clientId], phoneNumber, messages)
    .then((data) => res.send(data))
    .catch((err) => res.send(err));
});
app.listen(8080, () => {
  console.log("server connected to port 8080");
});

app.post("/re-auth", (req, res) => {
  const { clientId } = req.body;
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
  // console.log("creating client with clientId", clientId);
  return new Promise((clientReady, unableToCreateClient) => {
    clientsObj[clientId] = new Client({
      authStrategy: new LocalAuth({ clientId: clientId }),
    });

    let destruction = () => {};

    ws.onclose = () => {
      destruction = () => {
        clientsObj[clientId].destroy();
        console.log("client destroyed");
        setTimeout(() => {
          // NOTE: this may create an error when sending message with a secret key whose auth files were deleted
          deleteAuthFile(clientId);
          console.log("auth file deleted");
          delete clientsObj[clientId];
          console.log("client removed from clientsObj");
        }, 1000);
      };
      unableToCreateClient("ws connection closed");
    };
    clientsObj[clientId].on("qr", (qr) => {
      console.log("qr", qr);
      destruction();

      ws.send(JSON.stringify({ state: "qr-received", qr: qr }));
      // console.log(clientsObj[clientId]);
    });
    clientsObj[clientId].on("ready", () => {
      console.log("Client is ready!");
      clientReady(clientId);
      destruction();
      // setTimeout(() => clientsObj[clientId].destroy(), 3000);
    });
    // clientsObj[clientId].on("disconnected", async () => {
    //   console.log("client has disconnected");

    //   try {
    //     // Check if the client is still connected before destroying it
    //     if (clientsObj[clientId].status === "authenticated") {
    //       console.log("client is authenticated");
    //       await clientsObj[clientId].destroy();
    //     }
    //     delete clientsObj[clientId];
    //     console.log("deleted client from clientsObj");
    //     setTimeout(() => {
    //       deleteAuthFile(clientId); // Delete the authentication file
    //     }, 2000);
    //   } catch (err) {
    //     console.log("Error destroying WhatsApp client:", err);
    //   }
    // });

    clientsObj[clientId].initialize();
  });
}

// async function createClientAndSendMessage({ clientId, phoneNumber, messages }) {
//   return new Promise((messageSent, errorSendingMessage) => {
//     clientsObj[clientId] = new Client({
//       authStrategy: new LocalAuth({ clientId: clientId }),
//     });
//     clientsObj[clientId].on("qr", (qr) => {
//       console.log("qr", qr);
//       console.log("please authenticate the server with your whatsapp first");
//       errorSendingMessage(
//         "please authenticate the server with your whatsapp first"
//       );
//       // if (client) client.destroy();
//     });
//     clientsObj[clientId].on("ready", () => {
//       // console.log("Client is ready!");

//       sendMessage(clientsObj[clientId], phoneNumber, messages)
//         .then((response) => {
//           // console.log(response);
//           messageSent({ success: true });
//           // destroys the client to make space for next client;
//           setTimeout(() => clientsObj[clientId].destroy(), 10000);
//         })
//         .catch((error) => {
//           console.log(`failed to send message, error:`, error);
//           errorSendingMessage({ success: false });
//         });
//     });
//     clientsObj[clientId].on("auth_failure", (err) => {
//       console.log("auth_failure", err);
//     });
//     clientsObj[clientId].on("disconnected", () => {
//       console.log("client has disconnected");
//       setTimeout(() => {
//         fs.rm(
//           path.resolve(
//             __dirname,
//             `./.wwebjs_auth/session-${clientsObj[clientId].options.authStrategy.clientId}`
//           ),
//           { recursive: true },
//           (err) => {
//             console.log(err ? err : "file removed");
//           }
//         );
//       }, 500);
//     });
//     clientsObj[clientId].initialize();
//   });
// }
async function sendMessage(
  client,
  phoneNumber = "918696260393",
  messages = ["Jai Shree Ram"]
) {
  return new Promise((messageSent, err) => {
    const filtered = messages.filter((message) => message);
    if (!client)
      err("this secret key is not authenticated, please check the secret key");
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
  console.log("delete request received for client", clientId);
  // const clientId = client.options.authStrategy.clientId;
  // client.logout();
  // remove auth files from storage
  return new Promise(async (resolve, reject) => {
    if (clientsObj[clientId]) {
      console.log("deleting client", clientId);
      await clientsObj[clientId]
        .destroy()
        .then((data) => {
          console.log(data);
          delete clientsObj[clientId];
          setTimeout(() => {
            deleteAuthFile(clientId);
          }, 1000);
          resolve();
        })
        .catch((err) => {
          console.log(err);
          reject();
        });
    } else {
      console.log("client not found", clientId);
      resolve();
    }
  });
}

function deleteAuthFile(clientId) {
  const authFilePath = path.resolve(
    __dirname,
    `./.wwebjs_auth/session-${clientId}`
  );
  fs.access(authFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.log("Auth file does not exist for clientId:", clientId);
    } else {
      fs.rm(authFilePath, { recursive: true }, (err) => {
        if (err) {
          console.log("Error deleting auth file:", err);
        } else {
          console.log("Auth file removed for clientId:", clientId);
        }
      });
    }
  });
}
