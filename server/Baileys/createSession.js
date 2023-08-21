import makeWASocket, {
  DisconnectReason,
  BufferJSON,
  Browsers,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";

async function createAndSaveClient(clientId, clientWS) {
  return new Promise(async (resolve, reject) => {
    if (!clientId) {
      reject("clientId not provided");
      return;
    }
    if (!clientWS) {
      reject("websocket connection with client not provided");
      return;
    }

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

      sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
          console.log("qr received", qr);
          clientWS.send(
            JSON.stringify({ state: "qr-received", qr: update.qr })
          );
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
          console.log("opened connection");

          //   end the client after 3 seconds
          setTimeout(() => {
            sock.end("meriMarzi");
            resolve(clientId);
          }, 3000);
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
