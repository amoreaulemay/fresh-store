import { StoreStack } from "./mod.ts";

export { };

declare global {
    interface Window {
        stores: StoreStack;
    }
}