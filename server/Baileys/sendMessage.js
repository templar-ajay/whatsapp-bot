import makeWASocket, {
  DisconnectReason,
  BufferJSON,
  Browsers,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";

async function createClientAndSendMessage(clientId, phoneNumber, message) {
  return new Promise(async (resolve, reject) => {
    if (!clientId) {
      reject("clientId not provided");
      return;
    }
    // check if the clientId is logged in

    const { state, saveCreds } = await useMultiFileAuthState(
      "auth_info_baileys/" + clientId
    );

    function connectToWhatsApp() {
      const sock = makeWASocket.default({
        //   printQRInTerminal: true,
        auth: state,
        browser: Browsers.macOS("Baileys"),
        syncFullHistory: false,
      });

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
          console.log("qr received", qr);
          reject("this secret is not authenticated with any account")
        }
        if (connection === "close") {
          console.log("lastDisconnect", lastDisconnect);
          const shouldReconnect =
            lastDisconnect.error?.output?.statusCode !==
              DisconnectReason.loggedOut &&
            lastDisconnect.error !== "meriMarzi";
          console.log(
            "connection closed due to ",
            lastDisconnect.error,
            ", reconnecting ",
            shouldReconnect
          );
          // reconnect if not logged out
          if (shouldReconnect) {
            connectToWhatsApp();
          }
        } else if (connection === "open") {
          //   sendMessage(sock, "918696260393", "Jai Shree Ram");
          console.log("opened connection");

          sendMessage(sock, phoneNumber, message)
            .then((response) => {
              console.log("response for client", response);
              resolve(response);
            })
            .catch((err) => {
              console.log("error for client", err);
              reject(err);
            })
            .finally(() => {
              sock.end("meriMarzi");
              console.log("socket closed");
            });

          //   end the client after 3 seconds
        }
      });

      process.on("SIGINT", function () {
        // disconnect client
        sock.end("meriMarzi");
        process.exit();
      });
    }
    connectToWhatsApp();
  });
}

async function sendMessage(sock, phoneNumber, message) {
  return new Promise(async (sent, failed) => {
    //   check if the phoneNumber exists on whatsapp
    const [result] = await sock.onWhatsApp(phoneNumber);
    if (result.exists) {
      console.log(`${phoneNumber} exists on WhatsApp, as jid: ${result.jid}`);
    } else {
      failed("the provided phoneNumber does not exist on whatsapp");
      return;
    }

    sock
      .sendMessage(`${phoneNumber}@s.whatsapp.net`, {
        text: message,
      })
      .then((x) => {
        console.log("sock.sendMessage response", x);
        sent("message sent");
      })
      .catch((err) => {
        console.log("sock.sendMessage encountered an error:", err);
        failed(err);
      });
  });
}

export { createClientAndSendMessage };
