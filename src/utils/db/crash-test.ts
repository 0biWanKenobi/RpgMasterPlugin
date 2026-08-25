import { scalar } from "./shared";
import type { OpenDbConnectionFn } from "./types";

let crashDb:
    | Awaited<ReturnType<OpenDbConnectionFn>>
    | undefined;

export async function crashPrepare(openDatabase: OpenDbConnectionFn) {
    crashDb = await openDatabase();

    const { sqlite, db } = crashDb;

    await sqlite.exec(db, `--sql
        DROP TABLE IF EXISTS crash_test;

        CREATE TABLE crash_test (
            id INTEGER PRIMARY KEY,
            value TEXT NOT NULL
        );

        INSERT INTO crash_test(id, value)
        VALUES (1, 'before');

        INSERT INTO crash_test(id, value)
        VALUES (2, 'before');
    `);

    // This part is safely committed.
    // Now begin something we deliberately won't commit.

    await sqlite.exec(db, "BEGIN;");

    await sqlite.exec(db, `--sql
        UPDATE crash_test
        SET value = 'AFTER'
        WHERE id = 1;

        DELETE FROM crash_test
        WHERE id = 2;

        INSERT INTO crash_test(id, value)
        VALUES (3, 'AFTER');
    `);

    return {
        message: "Transaction is open. Kill Obsidian now."
    };
}

export async function crashCheck(openDatabase: OpenDbConnectionFn) {
    const { sqlite, db } = await openDatabase();

    try {
        const rows: unknown[] = [];

        await sqlite.exec(
            db,`--sql            
                SELECT id, value
                FROM crash_test
                ORDER BY id;
            `,
            (row, columns) => {
                rows.push(
                    Object.fromEntries(
                        columns.map((column, i) => [
                            column,
                            row[i],
                        ])
                    )
                );
            }
        );

        const integrity = await scalar(
            sqlite,
            db,
            "PRAGMA integrity_check;"
        );

        return {
            rows,
            integrity
        };
    } finally {
        await sqlite.close(db);
    }
}