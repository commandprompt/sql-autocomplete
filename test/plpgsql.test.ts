import { SQLAutocomplete, SQLDialect, AutocompleteOptionType } from "../index";
import {
  containsOptionType,
  allKeywordsBeginWith,
  containsOption,
} from "./utils/utils";
import { tableNames, columnNames, viewNames } from "./utils/testData";

let autocompleter: SQLAutocomplete;
let autocompleterWithViews: SQLAutocomplete;

beforeAll(() => {
  autocompleter = new SQLAutocomplete(SQLDialect.PLpgSQL);
  autocompleterWithViews = new SQLAutocomplete(
    SQLDialect.PLpgSQL,
    tableNames,
    columnNames,
    viewNames
  );
});

test("autocomplete detects table location", () => {
  const sql = "SELECT * FROM t";
  const plpgsqlOptions = autocompleter.autocomplete(sql, sql.length);
  expect(
    containsOptionType(plpgsqlOptions, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOptionType(plpgsqlOptions, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
  expect(allKeywordsBeginWith(plpgsqlOptions, "t")).toBeTruthy();
});

test("autocomplete detects column location", () => {
  const sql = "SELECT * FROM table1 WHERE c";
  const plpgsqlOptions = autocompleter.autocomplete(sql, sql.length);
  expect(
    containsOptionType(plpgsqlOptions, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOptionType(plpgsqlOptions, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
  expect(allKeywordsBeginWith(plpgsqlOptions, "c")).toBeTruthy();
});

test("autocomplete next word", () => {
  const sql = "SELECT ";
  const plpgsqlOptions = autocompleter.autocomplete(sql);
  expect(
    containsOptionType(plpgsqlOptions, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOptionType(plpgsqlOptions, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
});

test("autocomplete when position is not provided", () => {
  const sql = "SELECT * FR";
  const plpgsqlOptions = autocompleter.autocomplete(sql);
  expect(
    containsOptionType(plpgsqlOptions, AutocompleteOptionType.TABLE)
  ).toBeFalsy();
  expect(
    containsOptionType(plpgsqlOptions, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
  expect(allKeywordsBeginWith(plpgsqlOptions, "FR")).toBeTruthy();
});

test("shouldn't autocomplete view in create view statement", () => {
  const sql = "CREATE VIEW t";
  expect(autocompleterWithViews.viewNames.length).toBe(2);

  const options = autocompleterWithViews.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeFalsy();
  expect(
    containsOptionType(options, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.TABLE, "table1")
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});

test("autocomplete view in drop view statement", () => {
  const sql = "DROP VIEW t";

  const options = autocompleterWithViews.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "tableview1")
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});

test("autocomplete views and tables in select stmt", () => {
  const sql = "SELECT * FROM t";

  const options = autocompleterWithViews.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "tableview1")
  ).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.TABLE, "table1")
  ).toBeTruthy();
});

test("autocomplete view in alter view statement", () => {
  const sql = "ALTER VIEW t";

  const options = autocompleterWithViews.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "tableview1")
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});
