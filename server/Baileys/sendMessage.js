import makeWASocket, {
  DisconnectReason,
  BufferJSON,
  Browsers,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { isClientFolderExists, removeFilesAndFolder } from "../Utils/utils.js";

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
          reject("this secret is not authenticated with any account");
        }
        if (connection === "close") {
          console.log("lastDisconnect", lastDisconnect);
          const shouldReconnect =
            lastDisconnect.error?.output?.statusCode !==
              DisconnectReason.loggedOut &&
            lastDisconnect.error !== "meriMarzi";
          if (lastDisconnect?.error?.output?.payload?.error == "Unauthorized") {
            console.log(
              `this secret is no longer authorized. You may have logged out the session from whatsapp app`
            );
            reject(
              `this secret is no longer authorized. You may have logged out the session from whatsapp app. We are removing this secret key from our servers. Please generate a new secret key from the extension`
            );

            if (isClientFolderExists(clientId)) {
              removeFilesAndFolder(clientId);
            }

            return;
          }
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
    try {
      const [result] = await sock.onWhatsApp(phoneNumber);
      if (result.exists)
        console.log(`${phoneNumber} exists on WhatsApp, as jid: ${result.jid}`);
    } catch (err) {
      console.log("sock.onWhatsapp error: ", err);
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
