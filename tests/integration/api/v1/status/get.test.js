describe("GET to /api/status", () => {
  describe("Anonymous user", () => {
    test("Retrieving current system status", async () => {
      const response = await fetch("http://localhost:3000/api/v1/status");
      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody.updated_at).toBeDefined();
      expect(responseBody.version).toBeDefined();
      expect(responseBody.max_connections).toBeDefined();
      expect(responseBody.open_connections).toBeDefined();

      const parseUpdatedAt = new Date(responseBody.updated_at).toISOString();

      expect(responseBody.updated_at).toEqual(parseUpdatedAt);
      expect(responseBody.version).toBe("16.0");
      expect(typeof responseBody.max_connections).toBeTruthy();
      expect(typeof responseBody.open_connections).toBeTruthy();
      expect(responseBody.open_connections).toEqual(1);
    });
  });
});
