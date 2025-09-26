const express = require("express");

const app = express();

const port = 6969;

app.get('/', (req, res) => {
    res.send('Sure :)');
});
app.listen(port, ()=> {
    console.log(`Server started listening on :${port}`);
})