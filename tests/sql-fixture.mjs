import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
// Adapter executes the application's tagged SQL on an isolated PostgreSQL engine.
// It preserves nested fragments and parameter binding; no query outcomes are mocked.
function client(engine) {
  function sql(strings, ...values) {
    const fragment = { strings, values };
    fragment.then = (resolve, reject) => {
      const params = [];
      function compile(f) {
        let text = f.strings[0];
        for (let i = 0; i < f.values.length; i++) {
          const value = f.values[i];
          if (value?.strings && value?.values) text += compile(value);
          else {
            params.push(
              value?.jsonValue !== undefined
                ? JSON.stringify(value.jsonValue)
                : value,
            );
            text += `$${params.length}`;
          }
          text += f.strings[i + 1];
        }
        return text;
      }
      const text = compile(fragment);
      return engine
        .query(text, params)
        .then((r) => r.rows)
        .then(resolve, reject);
    };
    fragment.catch = (reject) => fragment.then(undefined, reject);
    return fragment;
  }
  sql.json = (value) => ({ jsonValue: value });
  sql.begin = (fn) => engine.transaction((tx) => fn(client(tx)));
  return sql;
}
export async function fixture() {
  const pg = new PGlite();
  await pg.exec(
    await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"),
  );
  return { pg, sql: client(pg), close: () => pg.close() };
}
