import express from "express";
import cors from "cors";
import { createAndSaveClient } from "./Baileys/createSession.js";
import { createClientAndSendMessage } from "./Baileys/sendMessage.js";
import {
  selectMessageFrom,
  formatPhoneNumber,
  isClientFolderExists,
  removeFilesAndFolder,
} from "./Utils/utils.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// For express-ws, we'll need to modify our approach slightly:
import expressWsFactory from "express-ws";
const expressWs = expressWsFactory(app);

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

// to make sure ony one send message request is sent at a time with a secret key
const currentRequests = {};

app.post("/send-message", (req, res) => {
  const { secret: clientId, phoneNumber, ...rest } = req.body;
  if (!clientId) {
    res.send("Please provide a secret.");
    return;
  }

  if (!isClientFolderExists(clientId)) {
    res.send(
      "Failed to send message: invalid secret key provided. Please get a valid secret key from the extension."
    );
    return;
  }

  if (!phoneNumber) {
    res.send("please provide a phoneNumber to send the message to.");
    return;
  }

  console.log("clientId", clientId);
  console.log("phoneNumber", phoneNumber);
  console.log("rest", rest);

  const theSelectedMessage = selectMessageFrom(rest);
  console.log("theSelectedMessage", theSelectedMessage);

  if (!theSelectedMessage) {
    res.send("please provide at least one message to choose from");
    return;
  }

  const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
  console.log("formattedPhoneNumber", formattedPhoneNumber);
  if (!formattedPhoneNumber) {
    res.send("the phoneNumber provided is in incorrect format");
    return;
  }

  // if we already received a request from that secret key, respond failure to the client
  if (!currentRequests[clientId]) {
    currentRequests[clientId] = true;
  } else {
    res.send(
      "failed: cannot send multiple requests at a time from the same secret key "
    );
    return;
  }

  createClientAndSendMessage(clientId, formattedPhoneNumber, theSelectedMessage)
    .then((response) => {
      res.send("success: " + response);
      return;
    })
    .catch((err) => {
      res.send("error: " + err);
      return;
    })
    .finally(() => {
      delete currentRequests[clientId];
    });
});

app.post("/re-auth", async (req, res) => {
  const { clientId } = req.body;
  console.log("clientID to remove", clientId);
  if (!clientId) {
    res.send({ response: "failed", reason: " no clientId provided" });
  }

  // await waitFor(3 * 1000);

  if (isClientFolderExists(clientId)) {
    // remove the folder from the filesystem
    removeFilesAndFolder(clientId).then((result) => {
      if (result.success) {
        console.log("All files, folders, and the main directory removed.");
      } else if (result.failedRemovals) {
        console.log(
          "Some files, folders, or the main directory could not be removed:"
        );
        result.failedRemovals.forEach((failedRemoval) => {
          console.error(`- ${failedRemoval.path}: ${failedRemoval.error}`);
        });
      } else {
        console.log("Some error occurred while removing files and folders.");
      }
    });

    res.send({
      response: "success",
      message: "authentication info of this secret was removed from the server",
    });
  } else {
    res.send({
      response: "success",
      message: "this client was already de-authenticated on our server",
    });
  }
});

const port = 8080;
app.listen(port, () => {
  console.log("server connected to port", port);
});
