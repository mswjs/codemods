import { setupServer } from "msw/node";
import { handleUnhandled } from "./handle-unhandled";

export const server = setupServer();

server.listen({ onUnhandledFrame: handleUnhandled });
