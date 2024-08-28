import { SQLAutocomplete, SQLDialect, AutocompleteOptionType } from "../index";
import {
  containsOption,
  containsOptionType,
  allKeywordsBeginWith,
} from "./utils";
let sqliteAutocomplete: SQLAutocomplete = null;

beforeAll(() => {
  sqliteAutocomplete = new SQLAutocomplete(SQLDialect.SQLITE);
});

test("autocomplete detects table location", () => {
  const sql = "SELECT * FROM t";
  const sqliteOptions = sqliteAutocomplete.autocomplete(sql, sql.length);
  expect(
    containsOptionType(sqliteOptions, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOptionType(sqliteOptions, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
  expect(allKeywordsBeginWith(sqliteOptions, "t")).toBeTruthy();
});

test("autocomplete detects column location", () => {
  const sql = "SELECT * FROM table1 WHERE c";
  const sqliteOptions = sqliteAutocomplete.autocomplete(sql, sql.length);
  expect(
    containsOptionType(sqliteOptions, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOptionType(sqliteOptions, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
  expect(allKeywordsBeginWith(sqliteOptions, "c")).toBeTruthy();
});

test("autocomplete next word", () => {
  const sql = "SELECT ";
  const sqliteOptions = sqliteAutocomplete.autocomplete(sql);
  expect(
    containsOptionType(sqliteOptions, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOptionType(sqliteOptions, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
});

test("autocomplete when position is not provided", () => {
  const sql = "SELECT * FR";
  const sqliteOptions = sqliteAutocomplete.autocomplete(sql);
  expect(allKeywordsBeginWith(sqliteOptions, "FR")).toBeTruthy();
});

test("shouldn't autocomplete view in create view statement", () => {
  const sql = "CREATE VIEW t";
  const tableNames = ["table1", "table2"];
  const columnNames = ["column1", "column2"];
  const viewNames = ["tableview1", "tableview2"];
  const autocompleterWithViews = new SQLAutocomplete(
    SQLDialect.SQLITE,
    tableNames,
    columnNames,
    viewNames
  );
  expect(autocompleterWithViews.viewNames.length).toBe(2);

  const options = autocompleterWithViews.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeFalsy();
  expect(
    containsOptionType(options, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "tableview1")
  ).toBeFalsy();
  expect(
    containsOption(options, AutocompleteOptionType.TABLE, "table1")
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});

test("autocomplete view in drop view statement", () => {
  const sql = "drop VIEW t";
  const tableNames = ["table1", "table2"];
  const columnNames = ["column1", "column2"];
  const viewNames = ["tableview1", "tableview2"];
  const autocompleterWithViews = new SQLAutocomplete(
    SQLDialect.SQLITE,
    tableNames,
    columnNames,
    viewNames
  );

  const options = autocompleterWithViews.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeTruthy();
  expect(containsOptionType(options, AutocompleteOptionType.TABLE)).toBeFalsy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "tableview1")
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});

test("autocomplete views and tables in select stmt", () => {
  const sql = "SELECT * FROM t";
  const tableNames = ["table1", "table2"];
  const columnNames = ["column1", "column2"];
  const viewNames = ["tableview1", "tableview2"];
  const autocompleterWithViews = new SQLAutocomplete(
    SQLDialect.SQLITE,
    tableNames,
    columnNames,
    viewNames
  );

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