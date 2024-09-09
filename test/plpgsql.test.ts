import { SQLAutocomplete, SQLDialect, AutocompleteOptionType } from "../index";
import { containsOptionType, containsOption } from "./utils/utils";
import { schemas } from "./utils/testData";

let autocompleter: SQLAutocomplete;

beforeAll(() => {
  autocompleter = new SQLAutocomplete(SQLDialect.PLpgSQL, schemas);
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

test("autocomplete detects column location based on table", () => {
  const sqlWithDot = "SELECT * FROM table1schema1 WHERE table1schema1.";
  const plpgsqlOptions = autocompleter.autocomplete(
    sqlWithDot,
    sqlWithDot.length
  );
  expect(
    containsOptionType(plpgsqlOptions, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
  expect(
    containsOption(
      plpgsqlOptions,
      AutocompleteOptionType.COLUMN,
      "column1table1schema1"
    )
  ).toBeTruthy();
  expect(
    containsOption(
      plpgsqlOptions,
      AutocompleteOptionType.COLUMN,
      "column1table2schema1"
    )
  ).toBeFalsy();

  const sqlWithDotCol = "SELECT * FROM table1 WHERE table1schema1.c";
  const plpgsqlOptions2 = autocompleter.autocomplete(
    sqlWithDotCol,
    sqlWithDotCol.length
  );
  expect(
    containsOptionType(plpgsqlOptions2, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
  expect(
    containsOption(
      plpgsqlOptions2,
      AutocompleteOptionType.COLUMN,
      "column1table1schema1"
    )
  ).toBeTruthy();
  expect(
    containsOption(
      plpgsqlOptions2,
      AutocompleteOptionType.COLUMN,
      "column1table2schema1"
    )
  ).toBeFalsy();

  const sqlWithColInsideStmt =
    "SELECT table1schema1.column2table1schema1, table1schema1. FROM table1 WHERE table1schema1";

  const plpgsqlOptions3 = autocompleter.autocomplete(
    sqlWithColInsideStmt,
    "SELECT table1schema1.column2table1schema1, table1schema1.".length
  );

  expect(
    containsOptionType(plpgsqlOptions3, AutocompleteOptionType.COLUMN)
  ).toBeTruthy();
  expect(
    containsOption(
      plpgsqlOptions3,
      AutocompleteOptionType.COLUMN,
      "column1table1schema1"
    )
  ).toBeTruthy();
  expect(
    containsOption(
      plpgsqlOptions3,
      AutocompleteOptionType.COLUMN,
      "column1table2schema1"
    )
  ).toBeFalsy();
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

  const options = autocompleter.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.TABLE)
  ).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.TABLE, "table1schema1")
  ).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.TABLE, "table2schema2")
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});

test("autocomplete view in drop view statement", () => {
  const sql = "DROP VIEW v";

  const options = autocompleter.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "view1schema1")
  ).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "view2schema2")
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

test("autocomplete view in alter view statement", () => {
  const sql = "ALTER VIEW t";

  const options = autocompleter.autocomplete(sql, sql.length);

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeTruthy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "view1schema1")
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
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
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});
test("shouldn't autocomplete schema twice", () => {
  const sql = "SELECT * FROM schema1.s";

  const options = autocompleter.autocomplete(sql, sql.length);

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
