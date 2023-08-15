const fs = require("fs");
const filePath = "requests.json";

function initializeFile() {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}));
  }
}

function stackMessage(secretKey, phoneNumber, message) {
  initializeFile();
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const newMessage = Message(phoneNumber, message);

  if (!data[secretKey]) {
    data[secretKey] = [];
  }

  data[secretKey].push(newMessage);
  fs.writeFileSync(filePath, JSON.stringify(data));
}

function retrieveRequests() {
  initializeFile();
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  for (let x in data) {
    if (data[x].length > 0) {
      const requests = [];
      requests = [...data[x]];
      // empty the requests from data
      delete data[x];
      fs.writeFileSync(filePath, JSON.stringify(data)); // Update the JSON file after removing the request
      return { secret: x, messageRequests: requests };
    }
  }

  return null; // Return null if no requests are available
}

function Message(phoneNumber, message) {
  const timeStamp = new Date().toISOString();
  return { timeStamp, phoneNumber, message };
}

module.exports = {
  stackMessage,
  retrieveRequests,
};
