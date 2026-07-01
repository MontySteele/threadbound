// S6.1 build identity (client side): __BUILD_SHA__ is injected by vite's
// `define` at build time; the typeof guard keeps node test environments
// (no vite transform) from crashing (S6.7).

import { CONTENT_VERSION } from '@threadbound/engine';

declare const __BUILD_SHA__: string | undefined;

export const BUILD_SHA: string = typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'dev';
export { CONTENT_VERSION };
export const VERSION_STAMP = `${CONTENT_VERSION} · ${BUILD_SHA}`;
