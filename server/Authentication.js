const { Client, LocalAuth, NoAuth } = require("whatsapp-web.js");
const { deleteAuthFile } = require("./utils/deleteAuthFile.js");
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const expressWs = require("express-ws")(app);

const { destruction } = require("./utils/destruction.js");

let destroyed = true;

app.post("/re-auth", (req, res) => {
  const { clientId } = req.body;
  deleteClient(clientId)
    .then(() => {
      console.log("started deletion of the old client", clientId);
      res.send({ response: "success" });
      return;
    })
    .catch((err) => {
      console.log("unable to delete the client", clientId);
      res.send({ response: "success" });
      return;
    });
});

app.ws("/authenticate", function (ws, req) {
  console.log("ws request received");
  ws.on("message", function (msg) {
    console.log("message received from client", msg);
    const { command, clientId } = JSON.parse(msg);

    if (command == "createClient") {
      if (!destroyed) {
        ws.send(JSON.stringify({ state: "server-busy" }));
      } else {
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
    }
  });
});

async function createAndSaveClient(clientId, ws) {
  console.log("creating client with clientId", clientId);
  return new Promise((clientReady, unableToCreateClient) => {
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: clientId }),
      // puppeteer: {
      //   // headless: true,
      //   // args: ["--no-sandbox", "--disable-setuid-sandbox"],
      // },
    });

    destroyed = false;

    ws.onclose = () => {
      if (!destroyed) {
        destruction({
          _client: clientsObj[clientId],
          clientId: clientId,
          _deleteAuthFile: true,
          destroyClient: true,
        });
        destroyed = true;
      }
      unableToCreateClient("ws connection closed");
    };

    client.on("qr", (qr) => {
      console.log("qr", qr);
      ws.send(JSON.stringify({ state: "qr-received", qr: qr }));
    });

    client.on("ready", () => {
      console.log("Client is ready!");
      if (!destroyed) {
        destruction({
          _client: clientsObj[clientId],
          clientId: clientId,
          _deleteAuthFile: false,
          destroyClient: true,
        });
        destroyed = true;
      }
      clientReady(clientId);
    });

    client.on("disconnected", async (reason) => {
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
          destroyClient: true,
        });
        destroyed = true;
      }
    });

    client.initialize();
  });
}

async function deleteClient(clientId) {
  console.log("delete request received for client", clientId);
  return new Promise(async (resolve, reject) => {
    console.log("client not found", clientId);
    deleteAuthFile(clientId);
    resolve();
  });
}

app.listen(8080, () => {
  console.log("authentication server connected to port 8080");
});
