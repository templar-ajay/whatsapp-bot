const { Client, LocalAuth, NoAuth } = require("whatsapp-web.js");
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

app.get("/", (req, res) => {
  console.log("hostname", req.hostname);
  console.log("referer", req.headers.referer);
  console.log("originalUrl", req.originalUrl);
  console.log("url", req.url);
  res.send("hi");
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
  // console.log("request received from", req.socket.remoteAddress);
  // console.log("request.hostname", req.hostname);
  // let reqFromCrm;
  // if (req.socket.remoteAddress == "::ffff:34.171.80.138") {
  //   reqFromCrm = "request received from crm";
  //   console.log(reqFromCrm);
  // } else {
  //   reqFromCrm = "request is not from crm";
  //   console.log(reqFromCrm);
  // }
  console.log("data received", req.body);
  const { secret: clientId, phoneNumber, ...rest } = req?.body?.customData;
  const messages = extractMessages(rest);

  if (!(clientId && phoneNumber && messages.length))
    res.send("data insufficient to make a send message request");
  console.log("received message request for client:", clientId);
  createClientAndSendMessage({
    clientId: clientId,
    phoneNumber: phoneNumber,
    messages: messages,
  }).then(async (response) => {
    console.log("response from internal functions", response);
    res.send(response);
  });

  // sendMessage(clientsObj[clientId], phoneNumber, messages)
  //   .then((data) => res.send(data))
  //   .catch((err) => res.send(err));
});

app.listen(8080, () => {
  console.log("server connected to port 8080");
});

app.post("/re-auth", (req, res) => {
  const { clientId } = req.body;
  deleteClient(clientId)
    .then(() => {
      console.log("started deletion of the old client", clientId);
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
      puppeteer: {
        headless: true,
        // args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });

    let destroyed = false;

    // self destructs the client instance in 3 minutes
    // const selfDestruct = setTimeout(() => {
    //   clientsObj[clientId].destroy();
    //   setTimeout(() => {
    //     deleteAuthFile(clientId);
    //   }, 1000);
    // }, 180000);

    ws.onclose = () => {
      if (!destroyed) {
        destruction({
          _client: clientsObj[clientId],
          clientId: clientId,
          _deleteAuthFile: true,
          deleteFromClientsObj: true,
          destroyClient: true,
        });
        destroyed = true;
      }
      unableToCreateClient("ws connection closed");
    };

    clientsObj[clientId].on("qr", (qr) => {
      console.log("qr", qr);
      ws.send(JSON.stringify({ state: "qr-received", qr: qr }));
    });

    clientsObj[clientId].on("ready", () => {
      console.log("Client is ready!");
      if (!destroyed) {
        destruction({
          _client: clientsObj[clientId],
          clientId: clientId,
          _deleteAuthFile: false,
          deleteFromClientsObj: true,
          destroyClient: true,
        });
        destroyed = true;
      }
      clientReady(clientId);
    });

    clientsObj[clientId].on("disconnected", async (reason) => {
      console.log("client has disconnected. Reason:", reason);
      console.log("clientId of the client that disconnected", clientId);
      // clientsObj[clientId].resetState();
      // if (clientsObj[clientId].status === "ready") {
      //   console.log("client is authenticated");
      //   try {
      //     await clientsObj[clientId].destroy();
      //   } catch (err) {
      //     console.log("Error destroying WhatsApp client:", err);
      //   }
      // }
      if (!destroyed) {
        destruction({
          _client: clientsObj[clientId],
          clientId: clientId,
          _deleteAuthFile: true,
          deleteFromClientsObj: true,
          destroyClient: true,
        });
        destroyed = true;
      }
    });

    clientsObj[clientId].initialize();
  });
}

async function createClientAndSendMessage({ clientId, phoneNumber, messages }) {
  console.log("clientsObj", clientsObj);
  console.log("creating client");

  return new Promise((complete) => {
    a_client = new Client({
      authStrategy: new LocalAuth({ clientId: clientId }),
      puppeteer: {
        headless: true,
        // args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });

    a_client.on("qr", (qr) => {
      console.log("qr", qr);
      console.log("please authenticate the server with your whatsapp first");
      errorSendingMessage(
        "please authenticate the server with your whatsapp first"
      );
      a_client.destroy();
      setTimeout(() => {
        deleteAuthFile(clientId);
      }, 1000);
    });
    a_client.on("ready", () => {
      // console.log("Client is ready!");
      let result;
      sendMessage(a_client, phoneNumber, messages)
        .then((response) => {
          result = response;
          console.log("message sent successfully", response);
        })
        .catch((error) => {
          result = error;
          console.log(`failed to send message, error:`, error);
        })
        .finally(() => {
          console.log("destroying the client after 10 seconds");
          // destroys the client to make space for next client;
          a_client.destroy().then(async () => {
            console.log("client destroyed");
            await timer(5 * 1000);
            complete(result);
          });
        });
    });
    a_client.on("auth_failure", (err) => {
      console.log("auth_failure", err);
    });
    a_client.on("disconnected", () => {
      console.log("client has disconnected");
      setTimeout(() => {
        fs.rm(
          path.resolve(__dirname, `./.wwebjs_auth/session-${clientId}`),
          { recursive: true },
          (err) => {
            console.log(err ? err : "file removed");
          }
        );
      }, 1000);
    });
    a_client.initialize();
  });
}

async function sendMessage(
  client,
  phoneNumber = "918696260393",
  messages = ["Jai Shree Ram"]
) {
  return new Promise(async (messageSent, err) => {
    const cleanNumber = phoneNumber
      .replaceAll(" ", "")
      .replaceAll("+", "")
      .replaceAll("(", "")
      .replaceAll(")", "")
      .replaceAll("-");
    console.log("clean Number", cleanNumber);
    const numberDetails = await client.getNumberId(cleanNumber);
    if (numberDetails) {
      const wid = numberDetails._serialized;

      const filteredMessages = messages.filter((message) => message);
      if (!client)
        err(
          "this secret key is not authenticated, please check the secret key"
        );
      const theMessage = filteredMessages[random(0, filteredMessages.length)];
      console.log("sending message:", theMessage, "to the wid", wid);
      client
        ?.sendMessage(wid, theMessage)
        .then(async (response) => {
          console.log("message sent", response);
          await timer(10 * 1000);
          messageSent(`message ${response.body} was sent to ${response.to}`);
        })
        .catch((error) => {
          err(error);
        });
    } else {
      err(`the given number "${phoneNumber}"is not registered on whatsapp`);
    }
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
      delete clientsObj[clientId];
      clientsObj[clientId].destroy();
      setTimeout(() => {
        deleteAuthFile(clientId);
      }, 1000);
      resolve();
    } else {
      console.log("client not found", clientId);
      deleteAuthFile(clientId);
      resolve();
    }

    // console.log("logging out client:", clientId);
    // a_client = new Client({
    //   authStrategy: new LocalAuth({ clientId: clientId }),
    //   puppeteer: {
    //     headless: true,
    //     args: ["--no-sandbox", "--disable-setuid-sandbox"],
    //   },
    // });

    // a_client.on("qr", (qr) => {
    //   console.log("client is already logged out");
    //   destruction({
    //     _client: a_client,
    //     clientId: clientId,
    //     _deleteAuthFile: true,
    //     destroyClient: true,
    //     deleteFromClientsObj: false,
    //     callback: resolve,
    //   });
    // });
    // a_client.on("ready", () => {
    //   // console.log("Client is ready!");
    //   setInterval(() => {
    //     a_client
    //       .logout()
    //       .then(() => {
    //         console.log("logged out client successfully");
    //         destruction({
    //           _client: a_client,
    //           clientId: clientId,
    //           _deleteAuthFile: true,
    //           deleteFromClientsObj: false,
    //           destroyClient: false,
    //         });
    //         resolve();
    //       })
    //       .catch((err) => {
    //         console.log("error logging out", err);
    //       });
    //   }, 10000);
    // });
    // a_client.initialize();
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

function destruction({
  _client,
  clientId,
  _deleteAuthFile = true,
  deleteFromClientsObj = true,
  destroyClient = true,
  callback = () => {},
}) {
  if (destroyClient) {
    _client.destroy();
  }
  console.log("client destroyed");
  if (deleteFromClientsObj) {
    delete clientsObj[clientId];
    console.log("client removed from clientsObj");
  }
  if (_deleteAuthFile) {
    setTimeout(() => {
      // NOTE: this may create an error when sending message with a secret key whose auth files were deleted
      deleteAuthFile(clientId);
      // console.log("auth file deleted");
    }, 1000);
  }
  console.log("clientsObj", clientsObj);
  callback();
}

function timer(ms) {
  console.log("waiting", ms / 1000, "seconds");
  return new Promise((res) => setTimeout(res, ms));
}
