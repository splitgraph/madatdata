import type { ReactNode } from "react";
import ReactReconciler from "react-reconciler";

const notImplemented = (funcName: string, ...args: unknown[]) => {
  console.warn(`NOT IMPLEMENTED[${funcName}]    `, ...args);
  // notImplemented(...arguments, ...args)
};

const reconciler = ReactReconciler({
  supportsMutation: true,
  createInstance(type, props) {
    console.log("CREATE INSTANCE", { type: type, props: props });
  },
  supportsPersistence: false,
  createTextInstance: function (
    text: string,
    rootContainer: unknown,
    hostContext: unknown,
    internalHandle: any
  ): unknown {
    notImplemented("createTextInstance(->undefined)", ...arguments);
    return undefined;
  },
  appendInitialChild: function (parentInstance: unknown, child: unknown): void {
    notImplemented("appendInitialChild", ...arguments);
  },
  finalizeInitialChildren: function (
    instance: unknown,
    type: unknown,
    props: unknown,
    rootContainer: unknown,
    hostContext: unknown
  ): boolean {
    notImplemented("finalizeInitialChildren(->undefined)", ...arguments);
    return false;
  },
  prepareUpdate: function (
    instance: unknown,
    type: unknown,
    oldProps: unknown,
    newProps: unknown,
    rootContainer: unknown,
    hostContext: unknown
  ): unknown {
    notImplemented("prepareUpdate(->undefined)", ...arguments);
    return undefined;
  },
  shouldSetTextContent: function (type: unknown, props: unknown): boolean {
    notImplemented("shouldSetTextContent(->false)", ...arguments);
    return false;
  },
  getRootHostContext: function (rootContainer: unknown): unknown {
    notImplemented("getRootHostContext(->undefined)", ...arguments);
    return undefined;
  },
  getChildHostContext: function (
    parentHostContext: unknown,
    type: unknown,
    rootContainer: unknown
  ): unknown {
    notImplemented("getChildHostContext(->undefined)", ...arguments);
    return undefined;
  },
  getPublicInstance: function (instance: unknown): unknown {
    notImplemented("getPublicInstance(->undefined)", ...arguments);
    return undefined;
  },
  prepareForCommit: function (
    containerInfo: unknown
  ): Record<string, any> | null {
    notImplemented("prepareForCommit(->{})", ...arguments);
    return {};
  },
  resetAfterCommit: function (containerInfo: unknown): void {
    notImplemented("resetAfterCommit", ...arguments);
  },
  preparePortalMount: function (containerInfo: unknown): void {
    notImplemented("preparePortalMount", ...arguments);
  },
  scheduleTimeout: function (
    fn: (...args: unknown[]) => unknown,
    delay?: number | undefined
  ): unknown {
    notImplemented("scheduleTimeout(->undefined)", ...arguments);
    return undefined;
  },
  cancelTimeout: function (id: unknown): void {
    notImplemented("cancelTimeout", ...arguments);
  },
  noTimeout: undefined,
  isPrimaryRenderer: false,
  getCurrentEventPriority: function (): number {
    notImplemented("getCurrentEventPriority(->0)", ...arguments);
    // Totally made up number, idk what Lane is
    return 0;
  },
  getInstanceFromNode: function (
    node: any
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
  prepareScopeUpdate: function (scopeInstance: any, instance: any): void {
    notImplemented("prepareScopeUpdate", ...arguments);
  },
  getInstanceFromScope: function (scopeInstance: any): unknown {
    notImplemented("getInstanceFromScope(->null)", ...arguments);
    return null;
    // notImplemented(...arguments, "Function not implemented: getInstanceFromScope");
  },
  detachDeletedInstance: function (node: unknown): void {
    notImplemented("detachDeletedInstance", ...arguments);
  },
  supportsHydration: false,
  clearContainer: function (container) {
    notImplemented("clearContainer(->null)", ...arguments);
    return null;
  },
  appendChildToContainer: function (container, child) {
    notImplemented("appendChildToContainer(->null)", ...arguments);
    return null;
  },
  removeChildFromContainer: function (container, child) {
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
};
