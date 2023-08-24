import makeWASocket, {
  DisconnectReason,
  Browsers,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { removeFilesAndFolder } from "../Utils/utils.js";

async function createAndSaveClient(clientId, clientWS) {
  return new Promise(async (resolve, reject) => {
    if (!clientId) return reject("clientId not provided");
    if (!clientWS)
      return reject("websocket connection with client not provided");

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

      let connectionOpened = false;

      clientWS.onclose = (reason) => {
        // this timeout of 3 seconds is a soft patch for when the clientWs is closed unexpectedly
        setTimeout(() => {
          console.log("ws connection with extension closed", reason);
          sock.end("meriMarzi");
          if (!connectionOpened) {
            removeFilesAndFolder(clientId)
              .then((res) => console.log(res))
              .catch((err) => console.log(err));
          }
        }, 3000);
      };

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
          console.log("qr received", qr);
          // to prevent sending message if the connection with client is already closed
          if (
            !(
              Number(clientWS.statusCode) >= 1001 &&
              Number(clientWS.statusCode <= 1015)
            )
          ) {
            clientWS.send(
              JSON.stringify({ state: "qr-received", qr: update.qr })
            );
          } else {
            // commenting this since the socket will anyways end from the setTimeout at line 36
            // sock?.end("meriMarzi");
          }
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
          if (shouldReconnect) connectToWhatsApp();
        } else if (connection === "open") {
          console.log("opened connection");
          // remove the function from the onclose event
          clientWS.onclose = null;
          // end the socket with whatsapp instantly
          sock.end("meriMarzi");
          resolve(clientId);
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

export { createAndSaveClient };
