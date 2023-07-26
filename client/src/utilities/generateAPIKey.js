const generateKey = async () => {
  let k = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const jwk = await crypto.subtle.exportKey("jwk", k);
  return jwk.k;
};

export default generateKey;

/**
 * usage:
 * ``` 
    const apiKey = await generateKey();
    console.log("apiKey", apiKey);
    ```
 */
