// Written by Benjamin Reichler
// server entrypoint for Node.js
// start server in terminal:
// node server.js


const express = require("express");
const app = express();
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


// call the compiled C++ file ./tokenizer input
const { execFile } = require("child_process");
app.get("/tokenize", (req, res) => {
    const input = req.query.input;
    execFile("./tokenizer.exe", [input], (err, stdout) => {
        res.json(JSON.parse(stdout));
    });
});

const path = require("path");
app.use(express.static(path.join(__dirname, "public")))
