// Written by Benjamin Reichler
// server entrypoint for Node.js
// start server in terminal:
// node server.js


const express = require("express");
const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
    res.send("Server running");
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


// call the compiled C++ file ./tokenizer input
import { execFile } from "child_process";
app.get("/tokenize", (req, res) => {
    const input = req.query.input;
    execFile("./tokenizer.exe", [input], (err, stdout) => {
        res.json(JSON.parse(stdout));
    });
});

