import { describe, it, expect /*vi, beforeEach*/ } from "vitest";
import { setupMswServerTestHooks } from "@madatdata/test-helpers/msw-server-hooks";
// import { compose, graphql, rest } from "msw";
import { ReadableStream } from "web-streams-polyfill/ponyfill";

describe("stream experiments", () => {
  setupMswServerTestHooks();

  // beforeEach(({ mswServer }) => {
  //   mswServer?.use(
  //     rest.post("/stream-expddn", (_req, res, ctx) => {
  //       return res(ctx.body());
  //     })
  //   );
  // });

  it("fetch and pipe to stream or something", async () => {
    expect(true).toBe(true);

    const randomStream = makeRandomReadableStream();

    const reader = randomStream.getReader();
    let charsReceived = 0;
    // let result = "";

    await reader
      .read()
      .then(function processText({ done, value }): void | Promise<void> {
        // Result objects contain two properties:
        // done  - true if the stream has already given you all its data.
        // value - some data. Always undefined when done is true.
        if (done) {
          console.log("Stream complete");
          return;
        }

        charsReceived += value.length;
        const chunk = value;
        console.log(
          "Read " +
            charsReceived +
            " characters so far. Current chunk = " +
            chunk
        );

        // Read some more, and call this function again
        return reader.read().then(processText);
      });
  });
});

const makeRandomReadableStream = (opts?: {
  intervalMs: number;
  timeoutMs: number;
}) => {
  const { intervalMs = 1000, timeoutMs = 4000 } = opts ?? {};

  const randomChars = () => {
    let string = "";
    let choices =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";

    for (let i = 0; i < 8; i++) {
      string += choices.charAt(Math.floor(Math.random() * choices.length));
    }
    return string;
  };

  let interval: ReturnType<typeof setInterval>;
  let timeout: ReturnType<typeof setTimeout>;

  return new ReadableStream({
    start(controller) {
      interval = setInterval(() => {
        let string = randomChars();

        // Add the string to the stream
        controller.enqueue(string);
      }, intervalMs);

      timeout = setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, timeoutMs);
    },
    pull(_controller) {
      // We don't really need a pull in this example
    },
    cancel() {
      // This is called if the reader cancels,
      // so we should stop generating strings
      clearInterval(interval);

      if (timeout) {
        clearTimeout(timeout);
      }
    },
  });
};

// view-source:https://mdn.github.io/dom-examples/streams/simple-random-stream/
