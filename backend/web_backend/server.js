require("dotenv").config();

const cors = require("cors")

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 8443;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
