import { SQLAutocomplete, SQLDialect, AutocompleteOptionType } from "../index";

import {
  containsOption,
  containsOptionType,
  allKeywordsBeginWith,
} from "./utils/utils";

let mysqlAutocomplete: SQLAutocomplete = null;

beforeAll(() => {
  mysqlAutocomplete = new SQLAutocomplete(SQLDialect.MYSQL);
});

test("autocomplete constructor options", () => {
  const autocompleterWithoutNames = new SQLAutocomplete(SQLDialect.MYSQL);
  expect(autocompleterWithoutNames.tableNames.length).toBe(0);
  expect(autocompleterWithoutNames.columnNames.length).toBe(0);

  const autocompleterWithNames = new SQLAutocomplete(
    SQLDialect.MYSQL,
    ["table1"],
    ["columnA"]
  );
  expect(autocompleterWithNames.tableNames.length).toBe(1);
  expect(autocompleterWithNames.columnNames.length).toBe(1);

  // Test for a table location
  const sqlWithTable = "SELECT * FROM t";
  const options = autocompleterWithoutNames.autocomplete(
    sqlWithTable,
    sqlWithTable.length
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
  expect(allKeywordsBeginWith(options, "t")).toBeTruthy();

  const options2 = autocompleterWithNames.autocomplete(
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
    containsOption(options2, AutocompleteOptionType.TABLE, "table1")
  ).toBeTruthy();
  expect(
    containsOptionType(options2, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
  expect(allKeywordsBeginWith(options2, "t")).toBeTruthy();

  // Test for a table or column location
  const sqlWithColumn = "SELECT * FROM table1 WHERE c";
  const options3 = autocompleterWithoutNames.autocomplete(
    sqlWithColumn,
    sqlWithColumn.length
  );
  expect(
    containsOptionType(options3, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOption(options3, AutocompleteOptionType.TABLE, null)
  ).toBeTruthy();
  expect(
    containsOptionType(options3, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
  expect(
    containsOption(options3, AutocompleteOptionType.COLUMN, null)
  ).toBeTruthy();
  expect(allKeywordsBeginWith(options3, "c")).toBeTruthy();

  const options4 = autocompleterWithNames.autocomplete(
    sqlWithColumn,
    sqlWithColumn.length
  );
  expect(
    containsOptionType(options4, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOption(options4, AutocompleteOptionType.TABLE, "table1")
  ).toBeFalsy();
  expect(
    containsOption(options4, AutocompleteOptionType.TABLE, null)
  ).toBeTruthy();
  expect(
    containsOptionType(options4, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
  expect(
    containsOption(options4, AutocompleteOptionType.COLUMN, "columnA")
  ).toBeTruthy();
  expect(allKeywordsBeginWith(options4, "c")).toBeTruthy();
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
  expect(allKeywordsBeginWith(mysqlOptions, "t")).toBeTruthy();
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
  expect(allKeywordsBeginWith(mysqlOptions, "c")).toBeTruthy();
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
  expect(allKeywordsBeginWith(mysqlOptions, "FR")).toBeTruthy();
});
