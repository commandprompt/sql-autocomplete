import { SQLAutocomplete, SQLDialect, AutocompleteOptionType } from "../index";
import { containsOptionType, containsOption } from "./utils/utils";
import { schemas } from "./utils/testData";

let autocompleter: SQLAutocomplete;

beforeAll(() => {
  autocompleter = new SQLAutocomplete(SQLDialect.TSQL, schemas);
});

test("autocomplete detects column location", () => {
  const sql = "SELECT * FROM table1 WHERE c";
  const tsqlOptions = autocompleter.autocomplete(sql, sql.length);
  expect(
    containsOptionType(tsqlOptions, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOptionType(tsqlOptions, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
});

test("autocomplete next word", () => {
  const sql = "SELECT ";
  const tsqlOptions = autocompleter.autocomplete(sql);
  expect(
    containsOptionType(tsqlOptions, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOptionType(tsqlOptions, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
});

test("autocomplete when position is not provided", () => {
  const sql = "SELECT * FR";
  const tsqlOptions = autocompleter.autocomplete(sql);
  expect(
    containsOptionType(tsqlOptions, AutocompleteOptionType.TABLE)
  ).toBeFalsy();
  expect(
    containsOptionType(tsqlOptions, AutocompleteOptionType.COLUMN)
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


test("autocomplete schema in select statement", () => {
  const sql = "SELECT * FROM s";

  const options = autocompleter.autocomplete(sql, sql.length);

  expect(
    containsOptionType(options, AutocompleteOptionType.SCHEMA)
  ).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.SCHEMA, "schema1")
  ).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.SCHEMA, "schema2")
  ).toBeTruthy();
})