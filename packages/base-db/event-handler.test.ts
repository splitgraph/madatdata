import { describe, it, expect } from "vitest";
import { makeEventTarget } from "./event-handler";

describe("EventHandler", () => {
  // NOTE: This test shows the weird ergonomics of wrapping an event handler
  // in an outer promise. This is because it was ported from Deno where it uses
  // the Deferred type to create promises ahead of time. So the adapted version
  // is a bit more verbose, but is also optional - it only matters if you want to
  // dispatch the event _and_ wait for all its subscribed listeners to complete.
  it("event handler can dispatch and handle events", async () => {
    const [etarget, cleanup] = makeEventTarget<{
      takeOneDown: {
        bottlesRemoved: number;
        resolve: () => void;
      };
    }>();

    const curCounts = {
      numWalls: 1,
      numBottlesOfBeer: 99,
      removalOps: [],
    };

    expect(curCounts.numBottlesOfBeer).toEqual(99);

    const takeOneDown = (
      onComplete: (value: void | PromiseLike<void>) => void
    ) =>
      etarget.dispatch<"takeOneDown">("takeOneDown", {
        bottlesRemoved: 1,
        resolve: onComplete,
      });

    // Create a listener that receives takeOneDown events, and mutates curCounts.numBottleOfBeer
    // to remove exactly the number of bottlesRemoved specified in the event payload
    // NOTE: "doesn't help" as in, only removes the number of bottles requested by event payload
    const unsubListenerThatDoesntHelpTakeDownBottles =
      etarget.on<"takeOneDown">("takeOneDown", ({ detail: payload }) => {
        curCounts.numBottlesOfBeer -= payload?.bottlesRemoved ?? 0;
        payload?.resolve();
      });

    expect(curCounts.numBottlesOfBeer).toEqual(99);

    await new Promise((resolve, _reject) => {
      takeOneDown(resolve);
    });
    expect(curCounts.numBottlesOfBeer).toEqual(98);

    await new Promise((resolve, _reject) => {
      takeOneDown(resolve);
    });
    expect(curCounts.numBottlesOfBeer).toEqual(97);

    // Create a listener that receives takeOneDown events, and mutates curCounts.numBottleOfBeer
    // to remove TWICE the number of bottlesRemoved specified in the event payload
    // NOTE: "helps" as in, contributes its own bottle removal services in addition to thsoe requested by the event payload
    const unsubListenerThatHelpsTakeDownBottles = etarget.on<"takeOneDown">(
      "takeOneDown",
      ({ detail: payload }) => {
        curCounts.numBottlesOfBeer -= 2 * (payload?.bottlesRemoved ?? 0);
        payload?.resolve();
      }
    );

    // We now have two listeners: One takes down 1 bottle, one takes down 2
    // So we expect -3 = 94 (we only await one promise since event handlers block?)
    await new Promise((resolve, _reject) => {
      takeOneDown(resolve);
    });
    expect(curCounts.numBottlesOfBeer).toEqual(94);

    // Now remove the original listener (which takes down as many bottles as specified in the event payload)
    unsubListenerThatDoesntHelpTakeDownBottles();

    // Now we are left with only the second listener (that takes down 2 bottles)
    // So we expect just -2 = 92
    await new Promise((resolve, _reject) => {
      takeOneDown(resolve);
    });
    expect(curCounts.numBottlesOfBeer).toEqual(92);

    // Now remove the second listener (which should be the only one remaining)
    unsubListenerThatHelpsTakeDownBottles();

    // const willNeverResolve = deferred<void>();
    // takeOneDown(willNeverResolve);

    // await delay(10);
    // assertEquals(willNeverResolve.state, "pending");
    // assertEquals(curCounts.numBottlesOfBeer, 92);

    cleanup();
  });
});
