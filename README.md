# whatsapp-web.js-automatic-messaging-solution

a custom solution to send automated whatsapp messages using a CRM or POST requests.

1. dev commands
   `cd client`
   `npm i`
   `npm run dev`
   new split terminal
   `cd server`
   `npm i`
   `npm run dev`

3. production commands for ubuntu

```bash
sudo apt update
sudo apt install npm
# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc
# install node
nvm install --lts

# installing the pm2 service
npm install -g pm2

# delete the logs after a certain amount of time
pm2 install pm2-logrotate
```

```bash
# start the process using pm2
pm2 start server.js --name server

# check logs of the process
pm2 logs 1
# here 1 is the id of the process
```
