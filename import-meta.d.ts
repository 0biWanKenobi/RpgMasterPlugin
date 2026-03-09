/// <reference types="node" />

// Extend the import.meta interface to include a custom `dirname` string.
// This is useful for tools or build steps that need to know the directory
// of the current module at runtime (similar to __dirname in CommonJS).

declare interface ImportMeta {
  /**
   * A string representing the directory of the current module, injected by the
   * build process or runtime environment when needed.
   */
  readonly dirname: string;
}
