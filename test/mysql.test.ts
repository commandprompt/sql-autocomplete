import { SQLAutocomplete, SQLDialect, AutocompleteOptionType } from "../index";

import {
  containsOption,
  containsOptionType,
  allKeywordsBeginWith,
} from "./utils/utils";
import { tableNames, columnNames, viewNames } from "./utils/testData";

let autocompleter: SQLAutocomplete;
let autocompleterWithViews: SQLAutocomplete;

beforeAll(() => {
  autocompleter = new SQLAutocomplete(SQLDialect.MYSQL);
  autocompleterWithViews = new SQLAutocomplete(
    SQLDialect.MYSQL,
    tableNames,
    columnNames,
    viewNames
  );
});

test("autocomplete detects table location", () => {
  const sql = "SELECT * FROM t";
  const mysqlOptions = autocompleter.autocomplete(sql, sql.length);
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
  const mysqlOptions = autocompleter.autocomplete(sql, sql.length);
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
  const mysqlOptions = autocompleter.autocomplete(sql);
  expect(
    containsOptionType(mysqlOptions, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOptionType(mysqlOptions, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
});

test("autocomplete when position is not provided", () => {
  const sql = "SELECT * FR";
  const mysqlOptions = autocompleter.autocomplete(sql);
  expect(
    containsOptionType(mysqlOptions, AutocompleteOptionType.TABLE)
  ).toBeFalsy();
  expect(
    containsOptionType(mysqlOptions, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
  expect(allKeywordsBeginWith(mysqlOptions, "FR")).toBeTruthy();
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
  const sql = "drop VIEW t";

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

test("autocomplete view in update statement", () => {
  const sql = "UPDATE t";

  const options = autocompleterWithViews.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "tableview1")
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});

test("autocomplete view in insert statement", () => {
  const sql = "INSERT INTO t";

  const options = autocompleterWithViews.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "tableview1")
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});

test("autocomplete view in delete statement", () => {
  const sql = "DELETE t";

  const options = autocompleterWithViews.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "tableview1")
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});

test("autocomplete view in rename statement", () => {
  const sql = "RENAME t";

  const options = autocompleterWithViews.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "tableview1")
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});

test("autocomplete view in alter view statement", () => {
  const sql = "ALTER t";

  const options = autocompleterWithViews.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "tableview1")
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});
