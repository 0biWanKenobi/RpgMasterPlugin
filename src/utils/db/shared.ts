import type { SQLiteFactory } from "./types";

export async function scalar(
    sqlite: ReturnType<SQLiteFactory>,
    db: number,
    sql: string
): Promise<unknown> {
    let result: unknown;

    await sqlite.exec(
        db,
        sql,
        (row) => {
            result = row[0];
        }
    );

    return result;
}
