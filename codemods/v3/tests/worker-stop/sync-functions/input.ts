import { worker } from "./mocks/browser";

afterAll(() => {
  worker.stop();
});

function teardown() {
  worker.stop();
  worker.stop();
}

export const cleanup = {
  stop() {
    worker.stop();
  },
  static run() {
    worker.stop();
  },
};

class Harness {
  static async stop() {
    worker.stop();
  }

  teardown = () => {
    worker.stop();
  };
}

worker.stop();
