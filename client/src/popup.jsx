import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
function Popup() {
  const [state, setState] = useState("start");
  const [QRCode, setQRCode] = useState("");
  useEffect(() => {
    const webSocket = new WebSocket("ws://127.0.0.1:8080/");

    webSocket.onopen = (event) => {
      console.log("connection opened");
      webSocket.send("request-qr");
      webSocket.onmessage = (event) => {
        const message = event.data;
        if (message == "") return;
        if (event.data == "Client is ready!") {
          setQRCode("");
          setState("client-ready");
        } else if (event.data) {
          setQRCode(event.data);
          setState("qr-received");
        }
      };
    };

    //
  }, []);
  return (
    <div className="container">
      <h1>
        {/* <span className="primary-text">Login</span> */}
        <span className="secondary-text">
          {state == "qr-received" && "scan this qr code via whatsapp app"}
        </span>
      </h1>
      {state == "start" && "requesting qr from server..."}
      {state == "qr-received" && <QRCodeSVG value={QRCode} />}
      {state == "client-ready" && "client is ready"}
    </div>
  );
}

const reactTarget = document.getElementById("react-target");
const root = createRoot(reactTarget);
root.render(<Popup />);
