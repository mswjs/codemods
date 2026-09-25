import { setupServer } from "msw/node";
import { setupWorker } from "msw/browser";

const onUnhandledRequest = "warn";

export const server = setupServer();
export const worker = setupWorker();

server.listen({ onUnhandledRequest: "error" });
worker.start({ "onUnhandledRequest": 'bypass', quiet: true });
server.listen({ onUnhandledRequest });
server.listen({ onUnhandledRequest: process.env.CI ? "error" : "warn" });
