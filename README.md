# whatsapp-web.js-automatic-messaging-solution
a custom solution to send automated whatsapp messages using a CRM or POST requests.

1. dev commands
   `cd client`
   `npm run dev`
   new split terminal
   `cd server`
   `npm run dev`

2. production commands for ubuntu

```bash
sudo apt update
sudo apt install npm
# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc
# install node
nvm install --lts
# install required packages to run puppeteer on ubuntu server
sudo apt install -y gconf-service libgbm-dev libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget


```

server commands for hosting

```bash
# installing the pm2 service
npm install -g pm2

# delete the logs after a certain amount of time
pm2 install pm2-logrotate

# start the process using pm2
pm2 start index.js --name myExpressServerName

# check logs of the process
pm2 logs 1
# here 1 is the id of the process
```
