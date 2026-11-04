import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const envResult = dotenv.config({
  path: path.join(currentDirectory, "config", ".env"),
});

if (envResult.error) {
  console.error("Could not load config/.env:", envResult.error.message);
  process.exit(1);
}

// Imported after dotenv.config so the application can read config/.env.
const { bootstrap } = await import("./src/bootstrap.js");

async function start() {
  try {
    const app = await bootstrap();
    const port = Number(process.env.PORT) || 3000;

    const server = app.listen(port, () => {
      console.log(`Saraha API is running on http://localhost:${port}`);
    });

    server.on("error", (error) => {
      console.error("Server failed to start:", error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error("Application failed to start:", error.message);
    process.exit(1);
  }
}

start();
