import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
import EditableText from "./components/SpecialInput.jsx";
import { Button } from "@mui/joy";
import generateKey from "./utilities/generateAPIKey.js";
import { address } from "./keys.js";

function Popup() {
  const [state, setState] = useState("start");
  const [QRCode, setQRCode] = useState("");
  const [secret, setSecret] = useState("");
  const [authenticatedSecret, setAuthenticatedSecret] = useState("");

  function saveSecret(secret) {
    chrome.storage.local.set({ secret: secret }, function () {
      setSecret(secret);
    });
  }
  function saveAuthenticatedSecret(authenticatedSecret) {
    chrome.storage.local.set(
      { authenticatedSecret: authenticatedSecret },
      function () {
        setAuthenticatedSecret(authenticatedSecret);
      }
    );
  }
  async function generateNewKeyAndSave() {
    const secretKey = await generateKey();
    saveSecret(secretKey);
  }
  async function reset() {
    await generateNewKeyAndSave();
    setState("start");
    saveAuthenticatedSecret("");
  }
  function handleReAuth() {
    fetch("http://" + address + ":8080/re-auth", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: authenticatedSecret,
      }),
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (body) {
        console.log(body);
        const { response, message } = body;
        if (response == "success") {
          console.log("message", message);
          reset();
        }
      })
      .catch((err) =>
        console.log("error sending delete request to server", err)
      );
  }

  useEffect(() => {
    (async () => {
      chrome.storage.local.get(
        ["secret", "authenticatedSecret"],
        async function (result) {
          const localSecret = result["secret"];
          const readyClient = result["authenticatedSecret"];
          console.log(localSecret);
          setSecret(localSecret);
          setAuthenticatedSecret(readyClient);
          if (readyClient) {
            setState("client-ready");
          } else if (!localSecret) {
            await generateNewKeyAndSave();
          }
        }
      );
    })();
  }, []);

  function getQRCode() {
    setState("requesting-qr");
    const webSocket = new WebSocket("ws://" + address + ":8080/authenticate");

    webSocket.addEventListener("open", (event) => {
      console.log("connection opened");
      webSocket.send(
        JSON.stringify({ clientId: secret, command: "createClient" })
      );
      // regenerate a new auth code
      generateNewKeyAndSave();
    });

    webSocket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      console.log("message", message);
      if (message == "") return;
      if (message.state == "client-ready") {
        setQRCode("");
        setState("client-ready");
        // tell local storage that the client is already logged in with this secret
        saveAuthenticatedSecret(message.clientId);
        console.log("client ready saved for ", authenticatedSecret);
      } else if (message.state == "qr-received") {
        setQRCode(message.qr);
        setState("qr-received");
      }
    });
  }

  return (
    <div className="container">
      <h1>
        <span className="secondary-text mb-3">
          {state == "qr-received" && "scan this qr code via whatsapp app"}
        </span>
      </h1>
      {(state == "start" || state == "requesting-qr") && (
        <>
          {state != "requesting-qr" ? (
            <EditableText
              handleChange={saveSecret}
              text={secret}
              enableEdit={false}
              enableCopy={true}
            />
          ) : (
            <EditableText
              handleChange={saveSecret}
              text={"Please be Patient..."}
              enableEdit={false}
              enableCopy={false}
            />
          )}
          <div className="button-container">
            <Button
              variant="outlined"
              color="success"
              onClick={generateNewKeyAndSave}
            >
              generate new secret key
            </Button>
            {secret?.length > 8 && (
              <Button
                key={1}
                color="success"
                loading={state == "requesting-qr"}
                onClick={getQRCode}
              >
                Get QR Code
              </Button>
            )}
          </div>
        </>
      )}
      {state == "qr-received" && (
        <>
          <QRCodeSVG value={QRCode} />
          <br />
          <span className="secondary-text mt-3">
            {state == "qr-received" &&
              "please keep the extension open until the server is authenticated"}
          </span>
        </>
      )}
      {state == "client-ready" && (
        <div style={{ textAlign: "left" }}>
          <h1>Server is Authenticated Your Unique Secret Key is</h1>
          <EditableText text={authenticatedSecret} enableEdit={false} />
          <small>
            if you want to re-authenticate server with another key{" "}
            <Button
              size="small"
              variant="plain"
              onClick={handleReAuth}
              className="reAuth-btn"
            >
              click here
            </Button>
          </small>
          <br />
          <small>
            <strong style={{ fontWeight: 700 }}>Note:</strong> before logging
            out the server from whatsapp
            <Button
              size="small"
              variant="plain"
              onClick={handleReAuth}
              className="reAuth-btn"
            >
              click here
            </Button>
            to disconnect the server first.
          </small>
        </div>
      )}
    </div>
  );
}

const reactTarget = document.getElementById("react-target");
const root = createRoot(reactTarget);
root.render(<Popup />);
