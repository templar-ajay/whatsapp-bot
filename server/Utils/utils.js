import * as fs from "fs";
import path from "path";

function formatPhoneNumber(phoneNumber) {
  const formattedNumber = phoneNumber
    .replaceAll(" ", "")
    .replaceAll("(", "")
    .replaceAll(")", "")
    .replaceAll("+", "")
    .replaceAll("-", "");

  const digitsOnlyRegex = /^\d+$/;
  return digitsOnlyRegex.test(formattedNumber) ? formattedNumber : false;
}

function selectMessageFrom(rest) {
  const messages = [];
  for (let key in rest) {
    if (key.includes("message") && rest[key]) messages.push(rest[key]);
  }
  return messages.length ? messages[random(0, messages.length)] : false;
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function isClientFolderExists(clientId) {
  const folderPath = getClientFolderPath(clientId);
  try {
    // Use fs.statSync to check if the folder exists
    const stats = fs.statSync(folderPath);
    return stats.isDirectory();
  } catch (error) {
    if (error.code === "ENOENT") return false; // Folder does not exist
    throw error; // Handle other errors
  }
}

function removeFilesAndFolder(clientId) {
  const directoryPath = getClientFolderPath(clientId);
  return new Promise((resolve) => {
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        console.error(`Error reading directory: ${err}`);
        resolve(false);
      } else {
        const removalPromises = files.map((file) => {
          const filePath = path.join(directoryPath, file);
          return new Promise((resolve) => {
            fs.stat(filePath, (error, stats) => {
              if (error) {
                console.error(`Error checking stats for ${filePath}: ${error}`);
                resolve({ success: false, path: filePath, error: error });
              } else {
                if (stats.isFile()) {
                  fs.unlink(filePath, (error) => {
                    if (error) {
                      console.error(
                        `Error removing file ${filePath}: ${error}`
                      );
                      resolve({ success: false, path: filePath, error: error });
                    } else resolve({ success: true });
                  });
                } else if (stats.isDirectory()) {
                  removeFilesAndFolder(filePath)
                    .then((result) => {
                      if (result.success) {
                        fs.rmdir(filePath, (error) => {
                          if (error) {
                            console.error(
                              `Error removing directory ${filePath}: ${error}`
                            );
                            resolve({
                              success: false,
                              path: filePath,
                              error: error,
                            });
                          } else resolve({ success: true });
                        });
                      } else resolve(result);
                    })
                    .catch((error) => {
                      resolve({ success: false, path: filePath, error: error });
                    });
                }
              }
            });
          });
        });

        Promise.all(removalPromises)
          .then((results) => {
            const failedRemovals = results.filter((result) => !result.success);
            if (failedRemovals.length === 0) {
              fs.rmdir(directoryPath, (error) => {
                if (error) {
                  console.error(
                    `Error removing main directory ${directoryPath}: ${error}`
                  );
                  resolve({
                    success: false,
                    path: directoryPath,
                    error: error,
                  });
                } else resolve({ success: true });
              });
            } else resolve({ success: false, failedRemovals: failedRemovals });
          })
          .catch(() => resolve({ success: false }));
      }
    });
  });
}

function getClientFolderPath(clientId) {
  return "./auth_info_baileys/" + clientId;
}

function waitFor(ms) {
  return new Promise((res) => {
    setTimeout(() => res(), ms);
  });
}

export {
  selectMessageFrom,
  formatPhoneNumber,
  isClientFolderExists,
  removeFilesAndFolder,
  waitFor,
};
