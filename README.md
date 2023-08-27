# whatsapp-web.js-automatic-messaging-solution

a custom solution to send automated whatsapp messages using a CRM or POST requests.

# development commands
## To install the chrome extension 
- `cd client`
- `npm i`
- `npm run dev`
- goto `chrome://extensions/`
- enable `developer mode`
- click `load unpacked`
- navigate to the `client` folder and select the `dist` folder
## To start the server locally
- `cd server`
- `npm i`
- `npm run dev`

- send message url - `http://localhost:8080/send-message`
- request type - POST
- JSON payload - 
```json
{
  "customData":  {
    "secret":"the secret key generated and authenticated by the chrome extension",
    "phoneNumber":"the phone number you want to send message along with country code",
    "message1":"the message you want to send",
    "message2":"you can send multiple messages and the server will randomly choose one messsage and send it"
  }
}
```

# production commands for ubuntu

```bash
# update ubuntu
sudo apt update

# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc

# install node
nvm install --lts

# installing the pm2 service
npm install -g pm2

# delete the logs after a certain amount of time
pm2 install pm2-logrotate

# clone this repo
git clone https://github.com/templar-ajay/whatsapp-bot.git

cd whatsapp-bot/server
npm i
```

Start the server

```bash
# start the process using pm2
pm2 start server.js --name server

# check logs of the process
pm2 logs 1
# here 1 is the id of the process
```
