import { useCallback, useContext, type ComponentPropsWithoutRef, type ReactNode } from "react";
import {
  createPath,
  createSearchParams,
  Link as ReactRouterLink,
  UNSAFE_LocationContext,
  UNSAFE_NavigationContext,
  UNSAFE_RouteContext,
  useInRouterContext,
  type NavigateFunction,
  type NavigateOptions,
  type To,
  type URLSearchParamsInit,
} from "react-router-dom";

type AppLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  to: string;
};

/**
 * Keeps shared components usable by both the Vite shell and the temporary
 * Next.js fallback while the app is being migrated route by route.
 */
export function AppLink({ to, ...props }: AppLinkProps) {
  const inRouter = useInRouterContext();

  if (inRouter) {
    return <ReactRouterLink to={to} {...props} />;
  }

  return <a href={to} {...props} />;
}

export function useAppLocation() {
  const routerLocation = useContext(UNSAFE_LocationContext)?.location;

  if (routerLocation) return routerLocation;

  return {
    pathname: typeof window === "undefined" ? "/" : window.location.pathname,
    search: typeof window === "undefined" ? "" : window.location.search,
    hash: typeof window === "undefined" ? "" : window.location.hash,
    state: null,
    key: "default",
  };
}

export function useAppSearchParams() {
  const locationContext = useContext(UNSAFE_LocationContext);
  const navigationContext = useContext(UNSAFE_NavigationContext);
  const pathname =
    locationContext?.location.pathname ??
    (typeof window === "undefined" ? "/" : window.location.pathname);
  const search =
    locationContext?.location.search ??
    (typeof window === "undefined" ? "" : window.location.search);

  const setSearchParams = useCallback(
    (
      nextInit:
        | URLSearchParamsInit
        | ((previous: URLSearchParams) => URLSearchParamsInit),
      options: NavigateOptions = {},
    ) => {
      const previous = new URLSearchParams(search);
      const next =
        typeof nextInit === "function" ? nextInit(previous) : nextInit;
      const nextSearch = createSearchParams(next).toString();
      const target = `${pathname}${nextSearch ? `?${nextSearch}` : ""}`;

      if (navigationContext) {
        if (options.replace) {
          navigationContext.navigator.replace(target, options.state);
        } else {
          navigationContext.navigator.push(target, options.state);
        }
        return;
      }

      if (typeof window !== "undefined") {
        const method = options.replace ? "replaceState" : "pushState";
        window.history[method](options.state ?? null, "", target);
      }
    },
    [navigationContext, pathname, search],
  );

  return [new URLSearchParams(search), setSearchParams] as const;
}

export function useAppNavigate(): NavigateFunction {
  const navigationContext = useContext(UNSAFE_NavigationContext);

  return useCallback(
    ((to: To | number, options: NavigateOptions = {}) => {
      if (typeof to === "number") {
        if (navigationContext) {
          navigationContext.navigator.go(to);
        } else if (typeof window !== "undefined") {
          window.history.go(to);
        }
        return;
      }

      if (navigationContext) {
        if (options.replace) {
          navigationContext.navigator.replace(to, options.state);
        } else {
          navigationContext.navigator.push(to, options.state);
        }
        return;
      }

      if (typeof window !== "undefined") {
        const target = typeof to === "string" ? to : createPath(to);
        if (options.replace) {
          window.history.replaceState(options.state ?? null, "", target);
        } else {
          window.history.pushState(options.state ?? null, "", target);
        }
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    }) as NavigateFunction,
    [navigationContext],
  );
}

export function useAppParams<
  T extends Record<string, string | undefined> = Record<
    string,
    string | undefined
  >,
>(): T {
  const routeContext = useContext(UNSAFE_RouteContext);
  const params = routeContext?.matches.at(-1)?.params ?? {};

  return params as T;
}

export type AppLinkChildren = ReactNode;
