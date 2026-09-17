const API_KEY = "sk_live_example_123456789";
const password = "SuperSecretPassword123";

function connect() {
  return {
    apiKey: API_KEY,
    password: password
  };
}

module.exports = connect;