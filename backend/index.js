const express = require("express");
const app = express();
const port = 6969;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Sure :)');
    console.log("Got a request on `/`. responded accordingly.");
});

app.post('/getmap', (req, res) => {
    const currentusrloc = req.body;

    console.log('User Data Received:', currentusrloc);

    res.status(200).json({
        message: 'Data received successfully on the server!',
        dataYouSent: currentusrloc
    });
});

app.listen(port, () => {
    console.log(`Server started listening on: ${port}`);
});

