import { SQLAutocomplete, SQLDialect, AutocompleteOptionType } from "../index";

import { containsOption, containsOptionType } from "./utils/utils";
import { schemas } from "./utils/testData";

let mysqlAutocomplete: SQLAutocomplete;

beforeAll(() => {
  mysqlAutocomplete = new SQLAutocomplete(SQLDialect.MYSQL, schemas);
});

test("autocomplete constructor options", () => {
  // Test for a table location
  const sqlWithoutTable = "SELECT * FROM schema3.t";
  const options = mysqlAutocomplete.autocomplete(
    sqlWithoutTable,
    sqlWithoutTable.length
  );
  expect(
    containsOptionType(options, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.TABLE, null)
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();

  const sqlWithTable = "SELECT * FROM schema1.t";
  const options2 = mysqlAutocomplete.autocomplete(
    sqlWithTable,
    sqlWithTable.length
  );
  expect(
    containsOptionType(options2, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOption(options2, AutocompleteOptionType.TABLE, null)
  ).toBeFalsy();
  expect(
    containsOption(options2, AutocompleteOptionType.TABLE, "table1schema1")
  ).toBeTruthy();
  expect(
    containsOptionType(options2, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();

  // Test for a table or column location
  const sqlWithColumn = "SELECT * FROM table1 WHERE c";

  const options3 = mysqlAutocomplete.autocomplete(
    sqlWithColumn,
    sqlWithColumn.length
  );
  expect(
    containsOptionType(options3, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOption(options3, AutocompleteOptionType.TABLE, "table1schema1")
  ).toBeTruthy();
  expect(
    containsOptionType(options3, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
  expect(
    containsOption(options3, AutocompleteOptionType.COLUMN, "column1")
  ).toBeTruthy();
});

test("autocomplete detects table location", () => {
  const sql = "SELECT * FROM t";
  const mysqlOptions = mysqlAutocomplete.autocomplete(sql, sql.length);
  expect(
    containsOptionType(mysqlOptions, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOptionType(mysqlOptions, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});

test("autocomplete detects column location", () => {
  const sql = "SELECT * FROM table1 WHERE c";
  const mysqlOptions = mysqlAutocomplete.autocomplete(sql, sql.length);
  expect(
    containsOptionType(mysqlOptions, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOptionType(mysqlOptions, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
});

test("autocomplete next word", () => {
  const sql = "SELECT ";
  const mysqlOptions = mysqlAutocomplete.autocomplete(sql);
  expect(
    containsOptionType(mysqlOptions, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOptionType(mysqlOptions, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
});

test("autocomplete when position is not provided", () => {
  const sql = "SELECT * FR";
  const mysqlOptions = mysqlAutocomplete.autocomplete(sql);
  expect(
    containsOptionType(mysqlOptions, AutocompleteOptionType.TABLE)
  ).toBeFalsy();
  expect(
    containsOptionType(mysqlOptions, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});
