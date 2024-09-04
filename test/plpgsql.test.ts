import { SQLAutocomplete, SQLDialect, AutocompleteOptionType } from "../index";
import { containsOptionType, containsOption } from "./utils/utils";
import {
  tableNames,
  columnNames,
  viewNames,
  schemaNames,
} from "./utils/testData";

let autocompleter: SQLAutocomplete;
let autocompleterWithViews: SQLAutocomplete;
let fullAutocompleter: SQLAutocomplete;

beforeAll(() => {
  autocompleter = new SQLAutocomplete(SQLDialect.PLpgSQL);
  autocompleterWithViews = new SQLAutocomplete(
    SQLDialect.PLpgSQL,
    tableNames,
    columnNames,
    viewNames
  );
  fullAutocompleter = new SQLAutocomplete(
    SQLDialect.PLpgSQL,
    tableNames,
    columnNames,
    viewNames,
    schemaNames
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
});

test("autocomplete view in create view statement", () => {
  const sql = "CREATE VIEW t";
  expect(autocompleterWithViews.viewNames.length).toBe(2);

  const options = autocompleterWithViews.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeTruthy();
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

test("autocomplete schema in select statement", () => {
  const sql = "SELECT * FROM s";

  const options = fullAutocompleter.autocomplete(sql, sql.length);

  expect(
    containsOptionType(options, AutocompleteOptionType.SCHEMA)
  ).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.SCHEMA, "schema1")
  ).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.SCHEMA, "schema2")
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});
test("shouldn't autocomplete schema twice", () => {
  const sql = "SELECT * FROM schema1.s";

  const options = fullAutocompleter.autocomplete(sql, sql.length);

  expect(
    containsOptionType(options, AutocompleteOptionType.SCHEMA)
  ).toBeFalsy();
  expect(
    containsOption(options, AutocompleteOptionType.SCHEMA, "schema1")
  ).toBeFalsy();
  expect(
    containsOption(options, AutocompleteOptionType.SCHEMA, "schema2")
  ).toBeFalsy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});
