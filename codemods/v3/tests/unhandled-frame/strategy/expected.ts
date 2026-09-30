import { setupServer } from "msw/node";
import { setupWorker } from "msw/browser";

const onUnhandledRequest = "warn";

export const server = setupServer();
export const worker = setupWorker();

server.listen({ onUnhandledFrame: "error" });
worker.start({ "onUnhandledFrame": 'bypass', quiet: true });
server.listen({ onUnhandledFrame: onUnhandledRequest });
server.listen({ onUnhandledFrame: process.env.CI ? "error" : "warn" });
