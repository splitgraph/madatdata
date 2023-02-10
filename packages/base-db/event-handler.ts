export interface EventHandler<Payloads extends PayloadMap> {
  dispatch: <EventName extends PayloadKeys<Payloads>>(
    eventName: EventName,
    payload: Payloads[EventName]
  ) => boolean;
  on: <EventName extends PayloadKeys<Payloads>>(
    eventName: EventName,
    listener: CustomEventListener<Payloads[EventName]>
  ) => () => void | Promise<void>;
}

type Payload = Record<string | number | symbol, any>;
type PayloadMap = Record<string, Payload>;

// For some reason intersecting with string is necessary, otherwise
// TS thinks eventName can be string | number | symbol ? (why??)
type PayloadKeys<Payloads extends PayloadMap> = string & keyof Payloads;

type CleanupCallback = () => void;
interface EventListenerObjectFor<T extends Event> {
  handleEvent(evt: T): void;
}
interface EventListenerFor<T extends Event> {
  (evt: T): void;
}
type EventListenerOrEventListenerObjectFor<T extends Event> =
  | EventListenerFor<T>
  | EventListenerObjectFor<T>;

type CustomEventListener<EventPayload extends Payload> =
  EventListenerOrEventListenerObjectFor<Event & { detail?: EventPayload }>;

export const makeEventTarget = <Payloads extends PayloadMap>(): [
  EventHandler<Payloads>,
  () => void
] => {
  const cleanupCallbacks: CleanupCallback[] = [];
  const target: EventTarget = new EventTarget();

  const ctx: EventHandler<Payloads> = {
    dispatch: <EventName extends PayloadKeys<Payloads>>(
      eventName: EventName,
      payload: Payloads[EventName]
    ) => {
      return target.dispatchEvent(
        new CustomEvent<Payloads[EventName]>(eventName, {
          detail: payload,
        })
      );
    },
    on: <EventName extends PayloadKeys<Payloads>>(
      eventName: EventName,
      listener: CustomEventListener<Payloads[EventName]>
    ) => {
      target.addEventListener(eventName, listener);

      const remove = () => target.removeEventListener(eventName, listener);
      cleanupCallbacks.push(remove);

      // To cleanup from this function, we want to call remove(), but
      // we _also_ want to remove remove() from the list of cleanupCallbacks
      // that would otherwise be called as part of the outer cleanupCallbacks
      const cleanup = () => {
        remove();
        const indexInCleanupCallbacks = cleanupCallbacks.indexOf(remove);
        if (indexInCleanupCallbacks > -1) {
          cleanupCallbacks.splice(indexInCleanupCallbacks, 1);
        }
      };

      return cleanup;
    },
  };

  const cleanup = async () =>
    await new Promise<void>((resolve) => {
      for (const clearListener of cleanupCallbacks) {
        clearListener();
      }

      resolve();
    });

  return [ctx, cleanup];
};

/* debugging helpers */

// type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
// type ExpandRecursively<T> = T extends object
//   ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
//   : T;
// type ExpandFunction<F extends Function> = F extends
//   (...args: infer A) => infer R ? (...args: Expand<A>) => Expand<R> : never;

// type EE = ExpandFunction<EventListener>;
// type EEE = Expand<Event>;
