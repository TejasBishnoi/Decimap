const express = require("express");
const fs = require('fs').promises; // Use the promise-based version of fs
const path = require('path');
const { randomUUID } = require('crypto');
const cors = require('cors'); // Import the CORS package

const app = express();
const port = 6969;
const dbPath = path.join(__dirname, 'database.json');

// --- MIDDLEWARE ---
app.use(cors()); // Add this line to enable CORS for all routes
app.use(express.json());

// --- DATABASE HELPER FUNCTIONS ---
async function readDatabase() {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        return data ? JSON.parse(data) : []; // Handle empty file
    } catch (error) {
        if (error.code === 'ENOENT') { // File doesn't exist yet
            return []; // Return empty array if file is not found
        }
        throw error; // Re-throw other errors
    }
}

async function writeDatabase(data) {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

// --- HA VERSINE DISTANCE FUNCTION ---
function getDistanceInMiles(lat1, lon1, lat2, lon2) {
    const R = 3959; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}


// --- ROUTES ---

// Easter egg route
app.get("/lol", (req,res) =>{
    const imagePath = path.join(__dirname, 'meme.jpg');
    res.sendFile(imagePath, (err) => {
        if (err) {
            console.log("Easter egg image not found!");
            res.status(404).send("Oops, the easter egg is missing!");
        }
    });
});

// Root route
app.get('/', (req, res) => {
    res.send('Sure :)');
    console.log("Got a request on `/`. Responded accordingly.");
});

// Route to get all heatmap data
app.get('/getmap', async (req, res) => {
    try {
        const database = await readDatabase();
        res.status(200).json(database);
    } catch (error) {
        console.error("Error reading database for /getmap:", error);
        res.status(500).json({ error: 'Could not read from database.' });
    }
});

// Route to find the quietest spot near a location
app.get('/find-quietest-spot', async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
        return res.status(400).json({ message: 'Latitude (lat) and Longitude (lon) are required query parameters.' });
    }

    try {
        const database = await readDatabase();
        if (database.length === 0) {
            return res.status(404).json({ message: 'No data points available to search.' });
        }

        const nearbyPoints = database.filter(point => {
            const distance = getDistanceInMiles(lat, lon, point.latitude, point.longitude);
            return distance <= 5; // 5-mile radius
        });

        if (nearbyPoints.length === 0) {
            return res.status(404).json({ message: 'No data points found within a 5-mile radius.' });
        }

        const quietestPoint = nearbyPoints.reduce((quietest, current) => {
            return parseFloat(current.dataPoint) < parseFloat(quietest.dataPoint) ? current : quietest;
        });

        res.status(200).json({ location: quietestPoint });

    } catch (error) {
        console.error("Error in /find-quietest-spot:", error);
        res.status(500).json({ message: 'An error occurred while searching for the quietest spot.' });
    }
});

// Route to receive and save data from a client
app.get('/givedata', async (req, res) => {
    const { data: encryptedData } = req.query;
    if (!encryptedData) {
        return res.status(400).json({ error: 'No data provided in query.' });
    }

    try {
        const jsonString = Buffer.from(encryptedData, 'base64').toString('utf8');
        const clientData = JSON.parse(jsonString);

        // Basic validation for required fields
        if (!clientData.latitude || !clientData.longitude || !clientData.data) {
             return res.status(400).json({ error: 'Missing required data fields: latitude, longitude, data.' });
        }

        const newEntry = {
            id: randomUUID(),
            latitude: clientData.latitude,
            longitude: clientData.longitude,
            dataPoint: clientData.data,
            timestamp: clientData.timestamp || new Date().toISOString()
        };

        const database = await readDatabase();
        database.push(newEntry);
        await writeDatabase(database);

        res.status(200).json({
            message: 'Data received and saved successfully!',
            appendedData: newEntry
        });

    } catch (error) {
        console.error("Failed to process data for /givedata:", error);
        res.status(500).json({ error: 'Invalid data format or server error.' });
    }
});

app.listen(port, () => {
    console.log(`Server started listening on: ${port}`);
});

