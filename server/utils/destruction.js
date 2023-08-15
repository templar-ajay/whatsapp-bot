const { deleteAuthFile } = require("./deleteAuthFile.js");
function destruction({
  _client,
  clientId,
  _deleteAuthFile = false,
  destroyClient = false,
  callback = () => {},
}) {
  if (destroyClient) {
    _client.destroy();
  }
  console.log("client destroyed");

  if (_deleteAuthFile) {
    setTimeout(() => {
      // NOTE: this may create an error when sending message with a secret key whose auth files were deleted
      deleteAuthFile(clientId);
      // console.log("auth file deleted");
    }, 1000);
  }
  callback();
}

module.exports = { destruction };
