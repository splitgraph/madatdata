import type { ReactNode } from "react";
import ReactReconciler from "react-reconciler";

const funcCallTable: Record<string, { calls: number; args: unknown[][] }> = {};

const describeFuncCall = (
  funcName: keyof typeof funcCallTable,
  funcIter: number,
  ...funcArgs: unknown[]
) => {
  console.log(`    ${funcIter}    ${funcName}(`);

  for (const arg of funcArgs) {
    console.log(
      "            ",
      arg,
      // add jitter to prevent devtools from combining two identical lines
      "," + Array(Math.floor(Math.random() * 10) + 2).join(" ")
    );
  }

  console.log("         )");
};

// const printPostRunDebuggingInfo = () => {
//   for (const funcName in funcCallTable) {
//     const funcMeta = funcCallTable[funcName];

//     console.log(`%c${funcName}: ${funcMeta.calls}`, "font-weight:bold;");

//     funcMeta.args.forEach((iterArgs, iterI) => {
//       describeFuncCall(funcName, iterI, ...iterArgs);
//     });
//   }
// };

const notImplemented = (funcName: string, ...args: unknown[]) => {
  if (!(funcName in funcCallTable)) {
    funcCallTable[funcName] = {
      calls: 0,
      args: [],
    };
  }

  const funcMeta = funcCallTable[funcName];
  funcMeta.calls += 1;
  funcMeta.args.push([...args]);

  describeFuncCall(funcName, funcMeta.calls, ...args);

  // console.log(`%c> ${funcName} (${funcMeta.calls})`, "font-weight:bold;");
  // args.forEach((arg, argI) => console.log("    arg[", argI, "]=", arg));

  // notImplemented(...arguments, ...args)
};

const reconciler = ReactReconciler({
  supportsMutation: true,
  createInstance(type, props) {
    console.log("CREATE INSTANCE", { type: type, props: props });
  },
  supportsPersistence: false,
  createTextInstance: function (
    _text: string,
    _rootContainer: unknown,
    _hostContext: unknown,
    _internalHandle: any
  ): unknown {
    notImplemented("createTextInstance(->undefined)", ...arguments);
    return undefined;
  },
  appendInitialChild: function (
    _parentInstance: unknown,
    _child: unknown
  ): void {
    notImplemented("appendInitialChild", ...arguments);
  },
  finalizeInitialChildren: function (
    _instance: unknown,
    _type: unknown,
    _props: unknown,
    _rootContainer: unknown,
    _hostContext: unknown
  ): boolean {
    notImplemented("finalizeInitialChildren(->undefined)", ...arguments);
    return false;
  },
  prepareUpdate: function (
    _instance: unknown,
    _type: unknown,
    _oldProps: unknown,
    _newProps: unknown,
    _rootContainer: unknown,
    _hostContext: unknown
  ): unknown {
    notImplemented("prepareUpdate(->undefined)", ...arguments);
    return undefined;
  },
  shouldSetTextContent: function (_type: unknown, _props: unknown): boolean {
    notImplemented("shouldSetTextContent(->false)", ...arguments);
    return false;
  },
  getRootHostContext: function (_rootContainer: unknown): unknown {
    notImplemented("getRootHostContext(->undefined)", ...arguments);
    return undefined;
  },
  getChildHostContext: function (
    _parentHostContext: unknown,
    _type: unknown,
    _rootContainer: unknown
  ): unknown {
    notImplemented("getChildHostContext(->undefined)", ...arguments);
    return undefined;
  },
  getPublicInstance: function (_instance: unknown): unknown {
    notImplemented("getPublicInstance(->undefined)", ...arguments);
    return undefined;
  },
  prepareForCommit: function (
    _containerInfo: unknown
  ): Record<string, any> | null {
    notImplemented("prepareForCommit(->{})", ...arguments);
    return {};
  },
  resetAfterCommit: function (_containerInfo: unknown): void {
    notImplemented("resetAfterCommit", ...arguments);
  },
  preparePortalMount: function (_containerInfo: unknown): void {
    notImplemented("preparePortalMount", ...arguments);
  },
  scheduleTimeout: function (
    _fn: (...args: unknown[]) => unknown,
    _delay?: number | undefined
  ): unknown {
    notImplemented("scheduleTimeout(->undefined)", ...arguments);
    return undefined;
  },
  cancelTimeout: function (_id: unknown): void {
    notImplemented("cancelTimeout", ...arguments);
  },
  noTimeout: undefined,
  isPrimaryRenderer: true,
  getCurrentEventPriority: function (): number {
    notImplemented("getCurrentEventPriority(->0)", ...arguments);
    // Totally made up number, idk what Lane is
    return 0;
  },
  getInstanceFromNode: function (
    _node: any
  ): ReactReconciler.Fiber | null | undefined {
    notImplemented("getInstanceFromNode(->null)", ...arguments);
    return null;
  },
  beforeActiveInstanceBlur: function (): void {
    notImplemented("beforeActiveInstanceBlur", ...arguments);
  },
  afterActiveInstanceBlur: function (): void {
    notImplemented("afterActiveInstanceBlur", ...arguments);
  },
  prepareScopeUpdate: function (_scopeInstance: any, _instance: any): void {
    notImplemented("prepareScopeUpdate", ...arguments);
  },
  getInstanceFromScope: function (_scopeInstance: any): unknown {
    notImplemented("getInstanceFromScope(->null)", ...arguments);
    return null;
  },
  detachDeletedInstance: function (_node: unknown): void {
    notImplemented("detachDeletedInstance", ...arguments);
  },
  supportsHydration: false,
  clearContainer: function (_container) {
    notImplemented("clearContainer(->null)", ...arguments);
    return null;
  },
  appendChildToContainer: function (_container, _child) {
    notImplemented("appendChildToContainer(->null)", ...arguments);
    return null;
  },
  removeChildFromContainer: function (_container, _child) {
    notImplemented("removeChildFromContainer(->null)", ...arguments);
    return null;
  },
});

type Container = any;

export const render = (element: ReactNode, container: Container) => {
  const root = reconciler.createContainer(
    container,
    0,
    null,
    false,
    null,
    "custo",
    (error: Error) => {
      console.log("Recoverable error:", error);
    },
    null
  );
  reconciler.updateContainer(element, root, null, null);

  // printPostRunDebuggingInfo();
};
