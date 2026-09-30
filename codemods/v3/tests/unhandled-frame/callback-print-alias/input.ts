import { setupServer } from "msw/node";
import { report } from "./report";

export const server = setupServer();

server.listen({
  onUnhandledRequest(request, print) {
    print.error();
    report(request, print);
  },
});
