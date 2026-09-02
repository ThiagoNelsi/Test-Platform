import type { ReactNode } from "react";
import {
  Link as ReactRouterLink,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
  type NavigateFunction,
} from "react-router-dom";

export const AppLink = ReactRouterLink;
export const useAppLocation = useLocation;
export const useAppSearchParams = useSearchParams;

export function useAppNavigate(): NavigateFunction {
  return useNavigate();
}

export function useAppParams<
  T extends Record<string, string | undefined> = Record<
    string,
    string | undefined
  >,
>(): T {
  return useParams() as T;
}

export type AppLinkChildren = ReactNode;
