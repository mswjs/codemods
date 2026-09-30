import { setupServer } from "msw/node";
import { handleOne, handleTwo } from "./handlers";

export const server = setupServer();

server.listen({ onUnhandledRequest: handleOne });
server.listen({ onUnhandledRequest: handleTwo });
