const { Client, LocalAuth, NoAuth } = require("whatsapp-web.js");
const { destruction } = require("./utils/destruction.js");
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { stackMessage, retrieveRequests } = require("./queueManager");

const clientsObj = {};

app.get("/", (req, res) => {
  res.send("hi");
});

app.post("/send-message", (req, res) => {
  console.log("data received", req.body);
  const { secret: clientId, phoneNumber, ...rest } = req?.body?.customData;
  const messages = extractMessages(rest);

  if (!(clientId && phoneNumber && messages.length)) {
    res.send(
      "data insufficient to make a send message request. one secret, one phoneNumber and at least one message is required"
    );
    return;
  }
  console.log("received send-message request for client:", clientId);

  const regex = /^[a-zA-Z0-9_-]*$/;

  if (!clientId.match(regex)) {
    res.send(
      "invalid client id: only alphanumeric characters, underscores and hyphens are allowed"
    );
    return;
  }

  const theMessage = select_a_RandomMessage(messages);

  // add the request to the queue
  stackMessage(secret, phoneNumber, theMessage);
  setTimeout(() => {
    processNextRequest();
  }, 100 * 1000);
  res.send(
    "message sending request has been Queued, messages will be stacked and then sent in bulk after a few minutes"
  );

  // createClientAndSendMessage({
  //   clientId: clientId,
  //   phoneNumber: phoneNumber,
  //   messages: messages,
  // }).then(async (response) => {
  //   console.log("response from internal functions", response);
  //   res.send(response);
  // });
});

app.listen(8000, () => {
  console.log("message server connected to port 8000");
});

function processRequest({ secret, messageRequests }) {
  // Simulate a promise-based task (e.g., sending an SMS, API call, etc.)
  return new Promise((resolve) => {
    console.log("Processing request:", secret, messageRequests);
    setTimeout(() => {
      // create client and send messages
      createClientAndSendMessages({ clientId: secret, messageRequests })
        .then((response) => {
          console.log(response);
        })
        .catch((err) => {
          console.log(err);
        })
        .finally(() => {
          console.log("Finished processing request:", request);
          resolve();
        });
    }, 2000); // Simulate a delay of 2000 milliseconds
  });
}

function processNextRequest() {
  const { secret, messageRequests } = retrieveRequests();

  if (messageRequests.length) {
    processRequest({ secret, messageRequests }).then(() => {
      processNextRequest(); // Recursively call to process the next request
    });
  } else {
    console.log("No more requests to process.");
  }
}

// // Simulate adding new messages to the queue
// stackMessage("s3cretK3y1", "+1234567890", "Request One");
// stackMessage("s3cretK3y1", "+1122334455", "Request Two");
// stackMessage("s3cretK3y2", "+0987654321", "Request Three");

// Start processing requests
// processNextRequest();

async function createClientAndSendMessages({ clientId, messageRequests }) {
  console.log("creating client");

  return new Promise((complete) => {
    a_client = new Client({
      authStrategy: new LocalAuth({ clientId: clientId }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });

    a_client.on("qr", (qr) => {
      console.log("qr", qr);
      console.log("please authenticate the server with your whatsapp first");
      complete("please authenticate the server with your whatsapp first");
      destruction({
        _client: a_client,
        clientId: clientId,
        _deleteAuthFile: true,
        destroyClient: true,
      });
    });

    a_client.on("ready", async () => {
      // console.log("Client is ready!");
      let results;
      // {phoneNubmer,message},{phoneNumber,message}
      for (const { phoneNumber, message } of messageRequests) {
        await new Promise((move_to_next_request) => {
          sendMessage(
            a_client,
            messageRequests[i].phoneNumber,
            messageRequests[i].message
          )
            .then((response) => {
              results.push(response);
              console.log("message sent successfully", response);
            })
            .catch((error) => {
              results.push(error);
              console.log(`failed to send message, error:`, error);
            })
            .finally(async () => {
              await timer(1 * 1000);
              move_to_next_request();
            });
        });
      }
      // destroys the client to make space for next client;
      console.log("destroying the client after 5 seconds");
      await timer(5 * 1000);
      a_client.destroy().then(async () => {
        console.log("client destroyed");
        // return the final results
        complete(results);
        return;
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
  message = "Jai Shree Ram"
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
    if (!numberDetails) {
      err(`the given number "${phoneNumber}"is not registered on whatsapp`);
      return;
    }

    const wid = numberDetails._serialized;

    if (!client)
      err("this secret key is not authenticated, please check the secret key");
    console.log("sending message:", message, "to the wid", wid);
    client
      ?.sendMessage(wid, message)
      .then(async (response) => {
        console.log("message sent", response);
        await timer(10 * 1000);
        messageSent(`message ${response.body} was sent to ${response.to}`);
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

function timer(ms) {
  console.log("waiting", ms / 1000, "seconds");
  return new Promise((res) => setTimeout(res, ms));
}

function select_a_RandomMessage(messages) {
  const filteredMessages = messages.filter((message) => message);
  const theMessage = filteredMessages[random(0, filteredMessages.length)];
  return theMessage;
}
