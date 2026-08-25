import { OpenDbConnectionFn } from "./types";

export async function commitCrashPrepare(openDatabase: OpenDbConnectionFn) {
    const { sqlite, db } = await openDatabase();

    await sqlite.exec(db, `--sql
        DROP TABLE IF EXISTS commit_crash_test;

        CREATE TABLE commit_crash_test (
            id INTEGER PRIMARY KEY,
            value TEXT NOT NULL
        );

        INSERT INTO commit_crash_test(id, value)
        VALUES
            (1, 'before'),
            (2, 'before');
    `);

    await sqlite.exec(db, "BEGIN;");

    await sqlite.exec(db, 
        `UPDATE commit_crash_test
        SET value = 'after'
        WHERE id = 1;

        DELETE FROM commit_crash_test
        WHERE id = 2;

        INSERT INTO commit_crash_test(id, value)
        VALUES (3, 'after');
    `);

    await sqlite.exec(db, "COMMIT;");

    // IMPORTANT:
    // Don't close DB, don't execute anything else.
    self.postMessage({
        type: "commit-crash-ready",
        message: "COMMIT returned. Force-stop Obsidian."
    });

    // Worker now intentionally does nothing.
    await new Promise(() => {});
}

export async function commitCrashCheck(openDatabase: OpenDbConnectionFn) {
    const { sqlite, db } = await openDatabase();


    const rows: Record<string, unknown>[] = [];
    await sqlite.exec(db,        
        `select * from commit_crash_test`,
    (row, columns) => {
        rows.push(
            Object.fromEntries(
                columns.map((column, index) => [
                    column,
                    row[index],
                ])
            )
        );
    })

    return rows;
}