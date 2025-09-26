const express = require("express");
const fs = require('fs').promises; // Using the promises version of fs
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
const port = 6969;
const dbPath = path.join(__dirname, 'database.json');

// --- Helper Functions ---

/**
 * Reads and parses the JSON database file.
 * @returns {Promise<Array>} A promise that resolves to an array of database entries.
 */
async function readDatabase() {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        // If the file is empty, return an empty array to prevent JSON.parse errors
        return data ? JSON.parse(data) : [];
    } catch (error) {
        // If the file doesn't exist, it's not an error; we'll create it on the first write.
        if (error.code === 'ENOENT') {
            return [];
        }
        // For any other errors (e.g., corrupt file), throw the error.
        console.error("Error reading or parsing database:", error);
        throw new Error('Could not read the database.');
    }
}

/**
 * Writes an array of data to the JSON database file.
 * @param {Array} data The data to write to the file.
 * @returns {Promise<void>}
 */
async function writeDatabase(data) {
    try {
        await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error writing to database:", error);
        throw new Error('Could not write to the database.');
    }
}

/**
 * Calculates the distance between two points on Earth in miles using the Haversine formula.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} The distance in miles
 */
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


// --- Middleware ---
app.use(express.json());


// --- Routes ---

app.get('/', (req, res) => {
    res.send('Sure :)');
});

app.get("/lol", async (req, res) => {
    const imagePath = path.join(__dirname, 'meme.jpg');
    try {
        await fs.access(imagePath);
        res.sendFile(imagePath);
    } catch {
        res.status(404).send("Oops, the easter egg is missing!");
    }
});

// Sends all data points for the heatmap
app.get('/getmap', async (req, res) => {
    try {
        const database = await readDatabase();
        res.status(200).json(database);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Receives and saves new data from a client
app.get('/givedata', async (req, res) => {
    const encryptedData = req.query.data;
    if (!encryptedData) {
        return res.status(400).json({ error: 'No data provided in the query.' });
    }

    try {
        const jsonString = Buffer.from(encryptedData, 'base64').toString('utf8');
        const clientData = JSON.parse(jsonString);
        
        // Basic validation
        if (!clientData.latitude || !clientData.longitude || !clientData.data) {
            return res.status(400).json({ error: 'Missing required data fields (latitude, longitude, data).' });
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
        
        res.status(201).json({ // 201 Created is more appropriate here
            message: 'Data received and saved successfully!',
            savedData: newEntry
        });

    } catch (error) {
        console.error("Error in /givedata route:", error);
        res.status(500).json({ error: 'Failed to process request. Check if data is valid.' });
    }
});

// Finds the quietest point within a 5-mile radius
app.get('/find-quietest-spot', async (req, res) => {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
        return res.status(400).json({ error: 'Latitude (lat) and longitude (lon) query parameters are required.' });
    }

    try {
        const userLat = parseFloat(lat);
        const userLon = parseFloat(lon);
        const database = await readDatabase();
        
        let quietestPoint = null;
        let minNoise = Infinity;

        for (const point of database) {
            const distance = getDistanceInMiles(userLat, userLon, point.latitude, point.longitude);
            if (distance <= 5) {
                const currentNoise = parseFloat(point.dataPoint);
                if (!isNaN(currentNoise) && currentNoise < minNoise) {
                    minNoise = currentNoise;
                    quietestPoint = point;
                }
            }
        }

        if (quietestPoint) {
            res.status(200).json({ message: 'Quietest location found.', location: quietestPoint });
        } else {
            res.status(404).json({ message: 'No data points found within a 5-mile radius.' });
        }
    } catch (error) {
        console.error("Error in /find-quietest-spot:", error);
        res.status(500).json({ error: 'Failed to process request.' });
    }
});


// --- Server Start ---
app.listen(port, () => {
    console.log(`Server started listening on: http://localhost:${port}`);
});

