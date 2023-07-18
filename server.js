require("dotenv").config();
const path = require("path");
const fs = require("fs");
const qrcode = require('qrcode-terminal');

const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "client-one" })
});

 client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});
client.on("remote_session_saved", () => {
    console.log(`session saved`); 
})
client.on('ready', () => {
    console.log('Client is ready!');
});
client.on("disconnected", () => {
    console.log("client has disconnected");
    setTimeout(() => {
        fs.rm(path.resolve(__dirname, `./.wwebjs_auth/session-${client.options.authStrategy.clientId}`), { recursive: true }, (err) => {
    console.log(err?err:"file removed")   
        })
    }, 500);
})

client.initialize();


