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
import expressWsFactory from "express-ws";

const port = 8080;
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// For express-ws, we'll need to modify our approach slightly:
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
  if (!req.body.customData) {
    return res.status(400).json({
      response: "failed",
      reason:
        "Error: received no data. To send a message, please provide the secret, phoneNumber, and at least 1 message to choose from.",
    });
  }
  const { secret: clientId, phoneNumber, ...rest } = req.body.customData;

  if (!clientId) return res.send("Please provide a secret.");
  if (!isClientFolderExists(clientId))
    return res.status(400).json({
      response: "failed",
      reason:
        "Failed to send message: invalid secret key provided. Please get a valid secret key from the extension.",
    });
  if (!phoneNumber)
    return res.status(400).json({
      response: "failed",
      reason: "please provide a phoneNumber to send the message to.",
    });

  console.log("clientId", clientId);
  console.log("phoneNumber", phoneNumber);
  console.log("rest", rest);

  const theSelectedMessage = selectMessageFrom(rest);
  console.log("theSelectedMessage", theSelectedMessage);

  if (!theSelectedMessage)
    return res.status(400).json({
      response: "failed",
      reason: "please provide at least one message to choose from",
    });

  const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
  console.log("formattedPhoneNumber", formattedPhoneNumber);

  if (!formattedPhoneNumber)
    return res.status(400).json({
      response: "failed",
      reason: "the phoneNumber provided is in incorrect format",
    });

  // if we already received a request from that secret key, respond failure to the client
  if (!currentRequests[clientId]) currentRequests[clientId] = true;
  else
    return res.status(400).json({
      response: "failed",
      reason:
        "failed: cannot send multiple requests at a time from the same secret key ",
    });

  createClientAndSendMessage(clientId, formattedPhoneNumber, theSelectedMessage)
    .then((response) =>
      res.status(200).json({ response: "success", reason: response })
    )
    .catch((err) =>
      res.status(400).json({ response: failed, reason: "error: " + err })
    )
    .finally(() => {
      delete currentRequests[clientId];
    });
});

app.post("/re-auth", async (req, res) => {
  const { clientId } = req.body;
  console.log("clientID to remove", clientId);
  if (!clientId) {
    res.send({ response: "failed", reason: " no clientId provided" });
    return;
  }

  // await waitFor(3 * 1000);

  if (isClientFolderExists(clientId)) {
    // remove the folder from the filesystem
    removeFilesAndFolder(clientId).then((result) => {
      if (result.success)
        console.log("All files, folders, and the main directory removed.");
      else if (result.failedRemovals) {
        console.log(
          "Some files, folders, or the main directory could not be removed:"
        );
        result.failedRemovals.forEach((failedRemoval) => {
          console.error(`- ${failedRemoval.path}: ${failedRemoval.error}`);
        });
      } else
        console.log("Some error occurred while removing files and folders.");
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

app.listen(port, () => console.log("server connected to port", port));
