const express = require("express");

const app = express();

app.get("/user", (req, res) => {
  const userId = Number(req.query.id);

  if (!Number.isInteger(userId)) {
    return res.status(400).json({
      error: "Invalid user ID"
    });
  }

  const query = "SELECT * FROM users WHERE id = ?";

  db.query(query, [userId], (error, result) => {
    if (error) {
      return res.status(500).send("Database error");
    }

    res.json(result);
  });
});

const apiKey = process.env.API_KEY;

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    configured: Boolean(apiKey)
  });
});

module.exports = app;