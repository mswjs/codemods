import { setupServer as setupNativeServer } from "msw/native";
import { http, HttpResponse } from "msw";

const server = setupNativeServer(
  http.get("/user", () => HttpResponse.json({ name: "John" })),
  http.get("/posts", () => HttpResponse.json([])),
);

export default setupNativeServer();

beforeAll(() => server.listen());
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterAll(() => server.close());
