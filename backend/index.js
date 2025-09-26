const express = require("express");
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
const port = 6969;
const dbPath = path.join(__dirname, 'database.json');

// Middleware to parse JSON for other routes if needed in the future
app.use(express.json());

// A simple root route
app.get('/', (req, res) => {
    res.send('Sure :)');
    console.log("Got a request on `/`. Responded accordingly.");
});

// **RENAMED ROUTE**: This route now sends all data points to the client (e.g., for a heatmap)
app.get('/getmap', (req, res) => {
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) { 
            console.error("Error reading database:", err);
            return res.status(500).json({ error: 'Could not read from database.' }); 
        }
        // FIX: Handle case where file might be empty on first read
        const jsonData = data ? JSON.parse(data) : [];
        res.status(200).json(jsonData);
    });
});

// **RENAMED ROUTE**: This route now receives data from a client and saves it
app.get('/givedata', (req, res) => {
    const encryptedData = req.query.data;
    if (!encryptedData) {
        return res.status(400).json({ error: 'No data provided in the query.' });
    }

    try {
        // 1. Decode and parse the data from the client
        const jsonString = Buffer.from(encryptedData, 'base64').toString('utf8');
        const clientData = JSON.parse(jsonString);
        console.log('Decrypted User Data Received:', clientData);

        // 2. Create the new entry for the database, adding a server-generated ID
        const newEntry = {
            id: randomUUID(),
            latitude: clientData.latitude,
            longitude: clientData.longitude,
            dataPoint: clientData.data, // Map 'data' from client to 'dataPoint' in the DB
            timestamp: clientData.timestamp
        };

        // 3. Read the existing database file
        fs.readFile(dbPath, 'utf8', (readErr, data) => {
            if (readErr) {
                console.error("Error reading database:", readErr);
                return res.status(500).json({ error: 'Could not read database to save new point.' });
            }

            let database;
            try {
                // FIX: If the file is empty (data is an empty string), initialize an empty array.
                database = data ? JSON.parse(data) : [];
            } catch (parseErr) {
                console.error("Error parsing JSON from database.json:", parseErr);
                return res.status(500).json({error: "Could not parse database file. The file might be corrupt."});
            }

            database.push(newEntry);

            // 4. Write the updated data back to the file
            fs.writeFile(dbPath, JSON.stringify(database, null, 2), (writeErr) => {
                if (writeErr) {
                    console.error("Error writing to database:", writeErr);
                    return res.status(500).json({ error: 'Could not save new point to database.' });
                }

                // 5. Send a success response after the data is saved
                res.status(200).json({
                    message: 'Data received and appended to database successfully!',
                    appendedData: newEntry
                });
            });
        });

    } catch (error) {
        console.error("Failed to decode or parse data:", error);
        res.status(500).json({ error: 'Invalid data format.' });
    }
});

app.listen(port, () => {
    console.log(`Server started listening on: ${port}`);
});

