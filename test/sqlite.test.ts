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

test("autocomplete detects column location based on table", () => {
  const sqlWithDot = "SELECT * FROM table1schema1 WHERE table1schema1.";
  const sqliteOptions = autocompleter.autocomplete(
    sqlWithDot,
    sqlWithDot.length
  );
  expect(
    containsOptionType(sqliteOptions, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
  expect(
    containsOption(
      sqliteOptions,
      AutocompleteOptionType.COLUMN,
      "column1table1schema1"
    )
  ).toBeTruthy();
  expect(
    containsOption(
      sqliteOptions,
      AutocompleteOptionType.COLUMN,
      "column1table2schema1"
    )
  ).toBeFalsy();

  const sqlWithDotCol = "SELECT * FROM table1 WHERE table1schema1.c";
  const sqliteOptions2 = autocompleter.autocomplete(
    sqlWithDotCol,
    sqlWithDotCol.length
  );
  expect(
    containsOptionType(sqliteOptions2, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
  expect(
    containsOption(
      sqliteOptions2,
      AutocompleteOptionType.COLUMN,
      "column1table1schema1"
    )
  ).toBeTruthy();
  expect(
    containsOption(
      sqliteOptions2,
      AutocompleteOptionType.COLUMN,
      "column1table2schema1"
    )
  ).toBeFalsy();

  const sqlWithColInsideStmt =
    "SELECT table1schema1.column2table1schema1, table1schema1. FROM table1 WHERE table1schema1";

  const sqliteOptions3 = autocompleter.autocomplete(
    sqlWithColInsideStmt,
    "SELECT table1schema1.column2table1schema1, table1schema1.".length
  );

  expect(
    containsOptionType(sqliteOptions3, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
  expect(
    containsOption(
      sqliteOptions3,
      AutocompleteOptionType.COLUMN,
      "column1table1schema1"
    )
  ).toBeTruthy();
  expect(
    containsOption(
      sqliteOptions3,
      AutocompleteOptionType.COLUMN,
      "column1table2schema1"
    )
  ).toBeFalsy();
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
