const express = require("express");
const db = require("./database");

const app = express();

app.get("/user", (req, res) => {
  const query = "SELECT * FROM users WHERE id = " + req.query.id;

  db.query(query, (error, result) => {
    if (error) {
      return res.status(500).send("Database error");
    }

    res.json(result);
  });
});

module.exports = app;