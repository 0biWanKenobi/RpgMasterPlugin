import type SQLite from "@journeyapps/wa-sqlite";

export type WorkerRequest =
    | { type: "run" }
    | { type: "read" }
    | { type: "delete" }
    | { type: "integrity" }
    | { type: "stress"; rows?: number }
    | { type: "crash-prepare" }
    | { type: "crash-check" }
    | { type: "stress-check" }
    | { type: "commit-crash-prepare" }
    | { type: "commit-crash-check" }
    ;

export type SQLiteFactory = typeof SQLite.Factory;
export type OpenDbConnectionFn = () => Promise<{
    sqlite: SQLiteAPI;
    db: number;
}>