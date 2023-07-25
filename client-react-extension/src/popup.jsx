import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
import EditableText from "./components/SpecialInput.jsx";
import { Button } from "@mui/joy";
import generateKey from "./utilities/generateAPIKey.js";

function Popup() {
  const [state, setState] = useState("start");
  const [QRCode, setQRCode] = useState("");
  const [secret, setSecret] = useState("");

  function saveSecret(secret) {
    chrome.storage.local.set({ secret: secret }, function () {
      setSecret(secret);
    });
  }
  async function generateNewKeyAndSave() {
    const secretKey = await generateKey();
    saveSecret(secretKey);
  }
  async function reset() {
    await generateNewKeyAndSave();
    setState("start");
    chrome.storage.local.set({ clientReady: "" }, function () {
      console.log("client Ready saved as ''");
    });
  }
  function handleReAuth() {
    fetch("http://127.0.0.1:8080/re-auth", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: secret,
      }),
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (body) {
        console.log(body);
        const { response } = body;
        if (response == "success") {
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
        ["secret", "clientReady"],
        async function (result) {
          const localSecret = result["secret"];
          const readyClient = result["clientReady"];
          console.log(localSecret);
          setSecret(localSecret);
          if (readyClient == localSecret && readyClient) {
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
    const webSocket = new WebSocket("ws://127.0.0.1:8080/authenticate");

    webSocket.addEventListener("open", (event) => {
      console.log("connection opened");

      webSocket.send(
        JSON.stringify({ clientId: secret, command: "createClient" })
      );
    });

    webSocket.addEventListener("message", (event) => {
      console.log(event.data);
      const message = JSON.parse(event.data);
      console.log("message", message);
      if (message == "") return;
      if (message.state == "client-ready") {
        setQRCode("");
        setState("client-ready");
        // tell local storage that the client is already logged in with this secret
        chrome.storage.local.set(
          { clientReady: message.clientId },
          function () {
            console.log("client ready saved for ", message.clientId);
          }
        );
      } else if (message.state == "qr-received") {
        setQRCode(message.qr);
        setState("qr-received");
      }
    });
  }
  return (
    <div className="container">
      <h1>
        <span className="secondary-text">
          {state == "qr-received" && "scan this qr code via whatsapp app"}
        </span>
      </h1>
      {(state == "start" || state == "requesting-qr") && (
        <>
          <EditableText handleChange={saveSecret} text={secret} />
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
      {state == "qr-received" && <QRCodeSVG value={QRCode} />}
      {state == "client-ready" && (
        <div>
          <h1>Server is Authenticated Your Unique Secret Key is</h1>
          <EditableText text={secret} enableEdit={false} />
          <small>
            if you want to re-authenticate server with another key,{" "}
            <Button
              size="small"
              variant="plain"
              onClick={handleReAuth}
              className="reAuth-btn"
            >
              click here
            </Button>
          </small>
        </div>
      )}
    </div>
  );
}

const reactTarget = document.getElementById("react-target");
const root = createRoot(reactTarget);
root.render(<Popup />);