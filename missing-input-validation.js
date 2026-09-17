const express = require("express");

const app = express();

app.post("/users", (req, res) => {
  const email = req.body.email;

  createUser(email);

  res.json({
    success: true
  });
});

function createUser(email) {
  console.log("Creating user:", email);
}

module.exports = app;