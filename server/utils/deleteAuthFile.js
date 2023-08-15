function deleteAuthFile(clientId) {
  const authFilePath = path.resolve(
    __dirname,
    `./.wwebjs_auth/session-${clientId}`
  );
  fs.access(authFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.log("Auth file does not exist for clientId:", clientId);
    } else {
      fs.rm(authFilePath, { recursive: true }, (err) => {
        if (err) {
          console.log("Error deleting auth file:", err);
        } else {
          console.log("Auth file removed for clientId:", clientId);
        }
      });
    }
  });
}
module.exports = { deleteAuthFile };
