import { network } from "@msw/react-native";
import { HttpNetworkFrame } from "msw/experimental";

const server = network;

beforeAll(() => {
  server.configure({
    onUnhandledFrame({ frame, defaults }) {
      if (!(frame instanceof HttpNetworkFrame)) {
        return;
      }

      const request = frame.data.request;
      console.log(request.url);
      defaults.warn();
    },
  });
  server.enable();
});
