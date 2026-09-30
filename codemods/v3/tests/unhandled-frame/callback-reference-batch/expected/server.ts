import { setupServer } from "msw/node";
import { handleOne, handleTwo } from "./handlers";

export const server = setupServer();

server.listen({ onUnhandledFrame: handleOne });
server.listen({ onUnhandledFrame: handleTwo });
