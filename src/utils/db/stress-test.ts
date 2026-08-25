import { scalar } from "./shared";
import type { OpenDbConnectionFn, SQLiteFactory } from "./types";


function campaignFor(i: number) {
    return `campaign-${i % 10}`;
}

function pathFor(i: number) {
    return `folder-${i % 250}/subfolder-${i % 25}/file-${i}.md`;
}

function hashFor(i: number) {
    return i
        .toString(16)
        .padStart(64, "0");
}

async function createStressSchema(
    sqlite: ReturnType<SQLiteFactory>,
    db: number
) {
    await sqlite.exec(db, `--sql
        DROP TABLE IF EXISTS stress_state;

        CREATE TABLE stress_state (
            ordinal INTEGER NOT NULL,

            campaign_id TEXT NOT NULL,
            path TEXT NOT NULL,
            remote_id TEXT,

            local_mtime INTEGER,
            local_size INTEGER,
            local_hash TEXT,

            remote_mtime INTEGER,
            remote_size INTEGER,
            remote_hash TEXT,

            existed_local INTEGER NOT NULL,
            existed_remote INTEGER NOT NULL,

            last_synced_at INTEGER,

            PRIMARY KEY (campaign_id, path)
        );

        CREATE UNIQUE INDEX idx_stress_remote_id
            ON stress_state(remote_id);

        CREATE INDEX idx_stress_campaign
            ON stress_state(campaign_id);
    `);
}

export async function stressTest(
    rowCount: number,
    SQLITE_DONE: number,
    SQLITE_ROW: number,
    openDatabase: OpenDbConnectionFn
) {
    const { sqlite, db } = await openDatabase();

    try {
        await createStressSchema(sqlite, db);

        // -------------------------
        // INSERT
        // -------------------------

        const insertStarted = performance.now();

        await sqlite.exec(db, "BEGIN;");

        try {
            const sql = `--sql
                INSERT INTO stress_state (
                    ordinal,

                    campaign_id,
                    path,
                    remote_id,

                    local_mtime,
                    local_size,
                    local_hash,

                    remote_mtime,
                    remote_size,
                    remote_hash,

                    existed_local,
                    existed_remote,

                    last_synced_at
                )
                VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?,
                    ?
                )
            `;

            for await (const stmt of sqlite.statements(db, sql)) {
                for (let i = 0; i < rowCount; i++) {
                    const timestamp =
                        1_700_000_000_000 + i;

                    sqlite.bind_collection(stmt, [
                        i,

                        campaignFor(i),
                        pathFor(i),
                        `drive-file-${i}`,

                        timestamp,
                        1_000 + (i % 1_000_000),
                        hashFor(i),

                        timestamp + 500,
                        1_000 + (i % 1_000_000),
                        hashFor(i + 1),

                        1,
                        1,

                        timestamp,
                    ]);

                    const result =
                        await sqlite.step(stmt);

                    if (result !== SQLITE_DONE) {
                        throw new Error(
                            `Unexpected INSERT result at row ${i}: ${result}`
                        );
                    }

                    await sqlite.reset(stmt);
                    sqlite.clear_bindings(stmt);

                    if (
                        i !== 0 &&
                        i % 5_000 === 0
                    ) {
                        self.postMessage({
                            type: "stress-progress",
                            phase: "insert",
                            current: i,
                            total: rowCount,
                        });
                    }
                }
            }

            await sqlite.exec(db, "COMMIT;");
        } catch (error) {
            try {
                await sqlite.exec(db, "ROLLBACK;");
            } catch {
                // Preserve original error.
            }

            throw error;
        }

        const insertMs =
            performance.now() - insertStarted;

        // -------------------------
        // VERIFY INSERT COUNT
        // -------------------------

        const storedCount = Number(
            await scalar(
                sqlite,
                db,
                "SELECT COUNT(*) FROM stress_state;"
            )
        );

        if (storedCount !== rowCount) {
            throw new Error(
                `Expected ${rowCount} rows, found ${storedCount}`
            );
        }

        // -------------------------
        // RANDOM-ISH POINT READS
        // -------------------------

        const readCount =
            Math.min(rowCount, 2_000);

        let readChecksum = 0;

        const readStarted =
            performance.now();

        const readSql = `
            SELECT ordinal
            FROM stress_state
            WHERE campaign_id = ?
              AND path = ?
        `;

        for await (
            const stmt of sqlite.statements(
                db,
                readSql
            )
        ) {
            for (
                let n = 0;
                n < readCount;
                n++
            ) {
                // Prime-ish stride so we're jumping
                // around the table rather than reading
                // sequentially.
                const i =
                    (n * 7919) % rowCount;

                sqlite.bind_collection(stmt, [
                    campaignFor(i),
                    pathFor(i),
                ]);

                let found = false;

                while (
                    await sqlite.step(stmt) ===
                    SQLITE_ROW
                ) {
                    found = true;

                    readChecksum += Number(
                        sqlite.column(stmt, 0)
                    );
                }

                if (!found) {
                    throw new Error(
                        `Point lookup failed for row ${i}`
                    );
                }

                await sqlite.reset(stmt);
                sqlite.clear_bindings(stmt);
            }
        }

        const pointReadMs =
            performance.now() - readStarted;

        // -------------------------
        // BULK UPDATE
        // -------------------------

        const updateStarted =
            performance.now();

        await sqlite.exec(db, `--sql
            UPDATE stress_state
            SET
                remote_mtime = remote_mtime + 1000,
                remote_hash = local_hash,
                last_synced_at = last_synced_at + 1000
            WHERE ordinal % 3 = 0;
        `);

        const updatedRows =
            sqlite.changes(db);

        const updateMs =
            performance.now() - updateStarted;

        const expectedUpdated =
            Math.ceil(rowCount / 3);

        if (updatedRows !== expectedUpdated) {
            throw new Error(
                `Expected ${expectedUpdated} updates, got ${updatedRows}`
            );
        }

        // -------------------------
        // INDEXED CAMPAIGN QUERY
        // -------------------------

        const campaignStarted =
            performance.now();

        const campaignRows = Number(
            await scalar(
                sqlite,
                db,
                `
                    SELECT COUNT(*)
                    FROM stress_state
                    WHERE campaign_id = 'campaign-3';
                `
            )
        );

        const campaignQueryMs =
            performance.now() - campaignStarted;

        // -------------------------
        // INTEGRITY
        // -------------------------

        const integrityStarted =
            performance.now();

        const integrity =
            await scalar(
                sqlite,
                db,
                "PRAGMA integrity_check;"
            );

        const integrityMs =
            performance.now() -
            integrityStarted;

        return {
            rowCount,
            storedCount,

            insertMs: Math.round(insertMs),

            pointReads: readCount,
            pointReadMs:
                Math.round(pointReadMs),
            readChecksum,

            updatedRows,
            updateMs: Math.round(updateMs),

            campaignRows,
            campaignQueryMs:
                Math.round(campaignQueryMs),

            integrity,
            integrityMs:
                Math.round(integrityMs),
        };
    } finally {
        await sqlite.close(db);
    }
}

export async function stressCheck(openDatabase: OpenDbConnectionFn) {
    const { sqlite, db } = await openDatabase();

    try {
        const count = Number(
            await scalar(
                sqlite,
                db,
                "SELECT COUNT(*) FROM stress_state;"
            )
        );

        const minOrdinal = Number(
            await scalar(
                sqlite,
                db,
                "SELECT MIN(ordinal) FROM stress_state;"
            )
        );

        const maxOrdinal = Number(
            await scalar(
                sqlite,
                db,
                "SELECT MAX(ordinal) FROM stress_state;"
            )
        );

        const updatedRows = Number(
            await scalar(
                sqlite,
                db,
                `--sql
                    SELECT COUNT(*)
                    FROM stress_state
                    WHERE remote_hash = local_hash;
                `
            )
        );

        const integrity =
            await scalar(
                sqlite,
                db,
                "PRAGMA integrity_check;"
            );

        return {
            count,
            minOrdinal,
            maxOrdinal,
            updatedRows,
            integrity,
        };
    } finally {
        await sqlite.close(db);
    }
}