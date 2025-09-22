import { server } from "msw";

server.events.on("request:start", ({ request, reqId }) => {
  let req = request;
  doStuff(req, reqId);
});
