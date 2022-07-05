import type { PropsWithChildren } from "react";
import { render } from "@testing-library/react";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

export const setupReactTestingLibrary = () => {
  afterEach(cleanup);
};

// TODO: Wrap children with any context providers here (none needed atm)
const TestProviders = ({ children }: PropsWithChildren<{}>) => children;

/**
 * Custom `render` method to use the required context providers by default.
 * @see https://testing-library.com/docs/react-testing-library/setup/#global-config
 */
// @ts-expect-error Type mismatch even though this is the recommended approach
const customRender: typeof render = (ui, options) =>
  render(ui, { wrapper: TestProviders, ...options });

export { customRender as render };
