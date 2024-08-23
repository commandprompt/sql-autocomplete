import {
  SQLAutocomplete,
  SQLDialect,
  AutocompleteOption,
  AutocompleteOptionType,
} from "../index";

let sqliteAutocomplete: SQLAutocomplete = null;

beforeAll(() => {
  sqliteAutocomplete = new SQLAutocomplete(SQLDialect.SQLITE);
});

function containsOptionType(
  options: AutocompleteOption[],
  type: AutocompleteOptionType
): boolean {
  for (const option of options) {
    if (option.optionType === type) {
      return true;
    }
  }
  return false;
}

function containsOption(
  options: AutocompleteOption[],
  type: AutocompleteOptionType,
  value: string | null
): boolean {
  for (const option of options) {
    if (option.optionType === type && option.value === value) {
      return true;
    }
  }
  return false;
}

function allKeywordsBeginWith(
  options: AutocompleteOption[],
  value: string
): boolean {
  value = value.toUpperCase();
  for (const option of options) {
    if (
      option.optionType === AutocompleteOptionType.KEYWORD &&
      !option.value.startsWith(value)
    ) {
      return false;
    }
  }
  return true;
}

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
  expect(
    containsOptionType(sqliteOptions, AutocompleteOptionType.TABLE)
  ).toBeFalsy();
  expect(
    containsOptionType(sqliteOptions, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
  expect(allKeywordsBeginWith(sqliteOptions, "FR")).toBeTruthy();
});

test.only("autocomplete view statement", () => {
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

  expect(containsOptionType(options, AutocompleteOptionType.VIEW)).toBeTruthy();
  expect(containsOptionType(options, AutocompleteOptionType.TABLE)).toBeFalsy();
  expect(
    containsOption(options, AutocompleteOptionType.VIEW, "tableview1")
  ).toBeTruthy();
  expect(
    containsOptionType(options, AutocompleteOptionType.COLUMN)
  ).toBeFalsy();
});
