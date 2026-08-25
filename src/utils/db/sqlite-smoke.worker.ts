import SQLiteESMFactory from "@journeyapps/wa-sqlite/dist/wa-sqlite.mjs";
import * as SQLite from "@journeyapps/wa-sqlite";

import { OPFSCoopSyncVFS }
    from "@journeyapps/wa-sqlite/src/examples/OPFSCoopSyncVFS.js";
import { stressCheck, stressTest } from "./stress-test";
import { crashCheck, crashPrepare } from "./crash-test";
import { commitCrashCheck, commitCrashPrepare } from "./transaction-crash-test"
import { WorkerRequest } from "./types";

const DB_NAME = "rpg-wa-sqlite-test.db";
const VFS_NAME = "rpg-opfs";

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    try {
        switch (event.data.type) {
            case "run":
                self.postMessage({
                    ok: true,
                    result: await runTest(),
                });
                break;

            case "read":
                self.postMessage({
                    ok: true,
                    result: await readTest(),
                });
                break;

            case "delete":
                await deleteTest();

                self.postMessage({
                    ok: true,
                });
                break;

            case "integrity":
            self.postMessage({
                ok: true,
                result: await integrityTest(),
            });
            break;

            case "stress":
                self.postMessage({
                    ok: true,
                    result: await stressTest(
                        event.data.rows ?? 25_000,
                        SQLite.SQLITE_DONE,
                        SQLite.SQLITE_ROW,
                        openDatabase
                    ),
                });
                break;

            case "stress-check":
                self.postMessage({
                    ok: true,
                    result: await stressCheck(openDatabase),
                });
                break;
            
            case "crash-prepare":
                self.postMessage({
                    ok: true,
                    result: await crashPrepare(openDatabase),
                });
                break;

            case "crash-check":
                self.postMessage({
                    ok: true,
                    result: await crashCheck(openDatabase),
                });
                break;
            case "commit-crash-prepare": 
                self.postMessage({
                    ok: true,
                    result: await commitCrashPrepare(openDatabase)
                })
                break;
            case "commit-crash-check":
                self.postMessage({
                    ok: true,
                    result: await commitCrashCheck(openDatabase)
                })
        }
    } catch (error) {
        self.postMessage({
            ok: false,
            error:
                error instanceof Error
                    ? `${error.name}: ${error.message}\n${error.stack ?? ""}`
                    : String(error),
        });
    }
};

async function openDatabase() {
    const module = await SQLiteESMFactory();
    const sqlite = SQLite.Factory(module);

    const vfs = await OPFSCoopSyncVFS.create(
        VFS_NAME,
        module
    );

    sqlite.vfs_register(vfs, true);

    const db = await sqlite.open_v2(
        DB_NAME,
        SQLite.SQLITE_OPEN_READWRITE |
            SQLite.SQLITE_OPEN_CREATE,
        VFS_NAME
    );

    return {
        sqlite,
        db,
    };
}

async function runTest() {
    const { sqlite, db } = await openDatabase();

    try {
        await sqlite.exec(db, `--sql
            CREATE TABLE IF NOT EXISTS smoke_test (
                id INTEGER PRIMARY KEY,
                value TEXT NOT NULL
            );

            DELETE FROM smoke_test where 1 = 1;

            INSERT INTO smoke_test(value)
            VALUES ('hello from Obsidian mobile');

            INSERT INTO smoke_test(value)
            VALUES ('persistent sqlite');
        `);

        return await queryRows(sqlite, db);
    } finally {
        await sqlite.close(db);
    }
}

async function readTest() {
    const { sqlite, db } = await openDatabase();

    try {
        return await queryRows(sqlite, db);
    } finally {
        await sqlite.close(db);
    }
}

async function queryRows(
    sqlite: ReturnType<typeof SQLite.Factory>,
    db: number
) {
    const rows: Record<string, unknown>[] = [];

    await sqlite.exec(
        db, 
        `--sql
            SELECT id, value
            FROM smoke_test
            ORDER BY id
        `,
        (row, columns) => {
            rows.push(
                Object.fromEntries(
                    columns.map((column, index) => [
                        column,
                        row[index],
                    ])
                )
            );
        }
    );

    return rows;
}

async function deleteTest() {
    const root = await navigator.storage.getDirectory();

    for (const suffix of ["", "-journal", "-wal"]) {
        const name = `${DB_NAME}${suffix}`;

        try {
            await root.removeEntry(name);
        } catch (error) {
            if (
                !(error instanceof DOMException) ||
                error.name !== "NotFoundError"
            ) {
                throw error;
            }
        }
    }
}

async function integrityTest() {
    const { sqlite, db } = await openDatabase();

    try {
        const rows: unknown[] = [];

        await sqlite.exec(
            db,
            `PRAGMA integrity_check;`,
            (row) => {
                rows.push(row[0]);
            }
        );

        return rows;
    } finally {
        await sqlite.close(db);
    }
}
