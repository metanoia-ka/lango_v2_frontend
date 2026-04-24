import { Authentication } from "./authentication";

export function authInitializer(auth: Authentication) {
  return () => auth.init();
}