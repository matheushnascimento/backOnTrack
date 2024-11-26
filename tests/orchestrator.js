import retry from "async-retry";
import database from "infra/database";
async function waitForWallServices() {
  await waitForWebServer();
}

async function clearDatabase() {
  await database.query("DROP schema public cascade; create schema public;");
}

async function waitForWebServer() {
  return retry(fetchStatusPage, {
    retries: 100,
    maxTimeout: 1000,
  });

  async function fetchStatusPage() {
    const response = await fetch("http://localhost:3000/api/v1/status");
    if (!response.ok) {
      throw new Error();
    }
  }
}
const orchestrator = {
  waitForWallServices,
  clearDatabase,
};

export default orchestrator;
