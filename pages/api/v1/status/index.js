import database from "infra/database.js";
export default async function status(req, response) {
  const databaseName = process.env.POSTGRES_DB;
  //#region Fetch database status
  const updatedAt = new Date().toISOString();
  const versionQuery = await database.query("SHOW server_version;");
  const openConnectionsQuery = await database.query({
    text: "SELECT count(*)::int AS open_connections FROM pg_stat_activity WHERE datname = $1;",
    values: [databaseName],
  });
  const maxConnectionsQuery = await database.query("SHOW max_connections;");
  //#endregion

  const queriesResponses = {};

  //#region QueriesResponse assignments
  queriesResponses.updated_at = updatedAt;
  queriesResponses.version = versionQuery.rows[0].server_version;
  queriesResponses.max_connections = parseInt(
    maxConnectionsQuery.rows[0].max_connections,
  );
  queriesResponses.open_connections =
    openConnectionsQuery.rows[0].open_connections;
  //#endregion
  response.status(200).json(queriesResponses);
}
