import { SQLAutocomplete, SQLDialect, AutocompleteOptionType } from "../index";
import { containsOption, containsOptionType } from "./utils/utils";
import { schemas } from "./utils/testData";
let autocompleter: SQLAutocomplete;

beforeAll(() => {
  autocompleter = new SQLAutocomplete(SQLDialect.SQLITE, schemas);
});

test("autocomplete detects table location", () => {
  const sql = "SELECT * FROM t";
  const sqliteOptions = autocompleter.autocomplete(sql, sql.length);
  expect(
    containsOptionType(sqliteOptions, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOptionType(sqliteOptions, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});

test("autocomplete detects column location", () => {
  const sql = "SELECT * FROM table1 WHERE c";
  const sqliteOptions = autocompleter.autocomplete(sql, sql.length);
  expect(
    containsOptionType(sqliteOptions, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOptionType(sqliteOptions, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
});

test("autocomplete next word", () => {
  const sql = "SELECT ";
  const sqliteOptions = autocompleter.autocomplete(sql);
  expect(
    containsOptionType(sqliteOptions, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOptionType(sqliteOptions, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
});

test("autocomplete when position is not provided", () => {
  const sql = "SELECT * FR";
  const sqliteOptions = autocompleter.autocomplete(sql);
  expect(
    containsOptionType(sqliteOptions, AutocompleteOptionType.KEYWORD)
  ).toBeTruthy();
});

test("shouldn't autocomplete view in create view statement", () => {
  const sql = "CREATE VIEW t";

  const options = autocompleter.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeFalsy();
  expect(
    containsOptionType(options, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "view1schema1")
  ).toBeFalsy();
  expect(
    containsOption(options, AutocompleteOptionType.TABLE, "table1schema1")
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});

test("autocomplete view in drop view statement", () => {
  const sql = "drop VIEW t";

  const options = autocompleter.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeTruthy();
  expect(containsOptionType(options, AutocompleteOptionType.TABLE)).toBeFalsy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "view1schema1")
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});

test("autocomplete views and tables in select stmt", () => {
  const sql = "SELECT * FROM t";

  const options = autocompleter.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "view1schema1")
  ).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.TABLE, "table1schema1")
  ).toBeTruthy();
});
