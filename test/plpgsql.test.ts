import { SQLAutocomplete, SQLDialect, AutocompleteOptionType } from "../index";
import {
  containsOptionType,
  allKeywordsBeginWith,
  containsOption,
} from "./utils";

let plpgsqlAutocomplete: SQLAutocomplete = null;

beforeAll(() => {
  plpgsqlAutocomplete = new SQLAutocomplete(SQLDialect.PLpgSQL);
});

test("autocomplete detects table location", () => {
  const sql = "SELECT * FROM t";
  const plpgsqlOptions = plpgsqlAutocomplete.autocomplete(sql, sql.length);
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
  const plpgsqlOptions = plpgsqlAutocomplete.autocomplete(sql, sql.length);
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
  const plpgsqlOptions = plpgsqlAutocomplete.autocomplete(sql);
  expect(
    containsOptionType(plpgsqlOptions, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOptionType(plpgsqlOptions, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
});

test("autocomplete when position is not provided", () => {
  const sql = "SELECT * FR";
  const plpgsqlOptions = plpgsqlAutocomplete.autocomplete(sql);
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
  const tableNames = ["table1", "table2"];
  const columnNames = ["column1", "column2"];
  const viewNames = ["tableview1", "tableview2"];
  const autocompleterWithViews = new SQLAutocomplete(
    SQLDialect.PLpgSQL,
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
    SQLDialect.PLpgSQL,
    tableNames,
    columnNames,
    viewNames
  );

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
  const tableNames = ["table1", "table2"];
  const columnNames = ["column1", "column2"];
  const viewNames = ["tableview1", "tableview2"];
  const autocompleterWithViews = new SQLAutocomplete(
    SQLDialect.PLpgSQL,
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
