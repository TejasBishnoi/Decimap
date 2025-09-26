const express = require("express");
const app = express();
const port = 6969;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Sure :)');
    console.log("Got a request on `/`. responded accordingly.");
});

app.get("/getmap", (req,res) => {
const encryptedData = req.query.data;
console.log("Got a request of get maps");
 if (!encryptedData) {
        return res.status(400).json({ error: 'No data provided in the query.' });
    }

    try {
        // 2. "Decrypt" the Base64 string back into a regular JSON string.
        // Node.js uses the Buffer object for this.
        const jsonString = Buffer.from(encryptedData, 'base64').toString('utf8');
        
        // 3. Parse the JSON string into a usable JavaScript object.
        const decryptedData = JSON.parse(jsonString);

        console.log('Decrypted User Data Received:', decryptedData);

        // 4. Send a success response back to the client with the decrypted data.
        res.status(200).json({
            message: 'Encrypted data received and decrypted successfully!',
            dataYouSent: decryptedData
        });

    } catch (error) {
        console.error("Failed to decode or parse data:", error);
        res.status(500).json({ error: 'Invalid data format. Could not decrypt.' });
    }

});
app.listen(port, () => {
    console.log(`Server started listening on: ${port}`);
});

