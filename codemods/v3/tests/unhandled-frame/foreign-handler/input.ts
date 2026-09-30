import { setupServer } from "msw/node";

export const server = setupServer();

server.listen({ onUnhandledRequest: "warn" });

export const monitorConfig = {
  onUnhandledRequest: "ignore",
};

export class RequestMonitor {
  onUnhandledRequest(request, print) {
    console.log(request.url);
    print.warning();
  }
}
