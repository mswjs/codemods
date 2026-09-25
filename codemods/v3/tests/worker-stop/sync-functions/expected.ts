import { worker } from "./mocks/browser";

afterAll(async () => {
  await worker.stop();
});

async function teardown() {
  await worker.stop();
  await worker.stop();
}

export const cleanup = {
  async stop() {
    await worker.stop();
  },
  static async run() {
    await worker.stop();
  },
};

class Harness {
  static async stop() {
    await worker.stop();
  }

  teardown = async () => {
    await worker.stop();
  };
}

await worker.stop();
