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
  run() {
    worker.stop();
  },
};

class Harness {
  static stop() {
    worker.stop();
  }

  teardown = () => {
    worker.stop();
  };
}

worker.stop();
