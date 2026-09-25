import { network } from "@msw/react-native";
import { http, HttpResponse } from "msw";

const server = network;
network.configure({
  handlers: [
    http.get("/user", () => HttpResponse.json({ name: "John" })),
    http.get("/posts", () => HttpResponse.json([])),
  ],
});

export default network;

beforeAll(() => server.enable());
beforeAll(() => (server.configure({ onUnhandledRequest: "bypass" }), server.enable()));
afterAll(() => server.disable());
