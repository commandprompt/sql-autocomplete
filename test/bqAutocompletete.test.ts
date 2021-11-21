import {
  SQLAutocomplete,
  SQLDialect,
  AutocompleteOption,
  AutocompleteOptionType,
  Schema,
  Table,
  Column,
  Project,
  BigQueryProjects,
} from "../index";

let bqAutocomplete: SQLAutocomplete = null;
beforeAll(() => {
  bqAutocomplete = new SQLAutocomplete(
    SQLDialect.BigQuery,
    new BigQueryProjects(
      [
        new Project("my-project", [
          new Schema("sch1", [new Table("tbl1", [new Column("colA")]), new Table("tbl1-A", [new Column("cola")])]),
          new Schema("sch2", [new Table("tbl2", [new Column("colB")])]),
          new Schema("ssch1", [new Table("tbl2-b", [new Column("colB")])]),
        ]),
        new Project("your-project", [
          new Schema("sch3", [new Table("tbl1", [new Column("colA")]), new Table("tbl1-B", [new Column("cola")])]),
          new Schema("sch4", [new Table("tbl2", [new Column("colB")])]),
          new Schema("s1", [new Table("tbl1", [new Column("colA")]), new Table("tbl1-A", [new Column("cola")])]),
          new Schema("ch1", [new Table("tbl1", [new Column("colA")]), new Table("tbl1-A", [new Column("cola")])]),
          new Schema("ch2", [new Table("tbl2", [new Column("colB")])]),
        ]),
      ],
      "my-project"
    )
  );
});

function containsOptionType(options: AutocompleteOption[], type: AutocompleteOptionType): boolean {
  for (const option of options) {
    if (option.optionType === type) {
      return true;
    }
  }
  return false;
}

function containsOption(options: AutocompleteOption[], type: AutocompleteOptionType, value: string): boolean {
  for (const option of options) {
    if (option.optionType === type && option.value === value) {
      return true;
    }
  }
  return false;
}

function allKeywordsBeginWith(options: AutocompleteOption[], value: string): boolean {
  value = value.toUpperCase();
  for (const option of options) {
    if (option.optionType === AutocompleteOptionType.KEYWORD && !option.value.startsWith(value)) {
      return false;
    }
  }
  return true;
}

test("autocomplete when bigquery select completion", () => {
  const sql = "sel";
  const bqOptions = bqAutocomplete.autocomplete(sql);
  expect(containsOptionType(bqOptions, AutocompleteOptionType.KEYWORD)).toBeTruthy();
  expect(bqOptions.filter((opt) => opt.optionType === AutocompleteOptionType.KEYWORD)[0].value).toEqual("SELECT");
});

test("autocomplete when bigquery keyword completion", () => {
  const sql = "select * fr";
  const bqOptions = bqAutocomplete.autocomplete(sql);
  expect(containsOptionType(bqOptions, AutocompleteOptionType.KEYWORD)).toBeTruthy();
  expect(bqOptions.filter((opt) => opt.optionType === AutocompleteOptionType.KEYWORD)[0].value).toEqual("FROM");
});

test("autocomplete when bigquery project completion", () => {
  const sql = "SELECT * FROM `my";
  const bqOptions = bqAutocomplete.autocomplete(sql);
  expect(containsOptionType(bqOptions, AutocompleteOptionType.PROJECT)).toBeTruthy();
  expect(bqOptions.filter((opt) => opt.optionType === AutocompleteOptionType.PROJECT)[0].value).toEqual("`my-project.");
});

test("autocomplete when bigquery schema completion with project", () => {
  const sql = "SELECT * FROM `your-project.ch";
  const bqOptions = bqAutocomplete.autocomplete(sql);
  expect(containsOptionType(bqOptions, AutocompleteOptionType.SCHEMA)).toBeTruthy();
  const schemaOptions = bqOptions.filter((opt) => opt.optionType === AutocompleteOptionType.SCHEMA);
  expect(schemaOptions.length).toEqual(4);
  expect(schemaOptions[0].value).toEqual("sch3.");
});

test("autocomplete when bigquery schema completion with project and grave", () => {
  const sql = "SELECT * FROM `your-project.ch";
  const bqOptions = bqAutocomplete.autocomplete(sql);
  expect(containsOptionType(bqOptions, AutocompleteOptionType.SCHEMA)).toBeTruthy();
  const schemaOptions = bqOptions.filter((opt) => opt.optionType === AutocompleteOptionType.SCHEMA);
  expect(schemaOptions.length).toEqual(4);
  expect(schemaOptions[0].value).toEqual("sch3.");
});

test("autocomplete when bigquery schema completion without project", () => {
  const sql = "SELECT * FROM ch1";
  const bqOptions = bqAutocomplete.autocomplete(sql);
  expect(containsOptionType(bqOptions, AutocompleteOptionType.SCHEMA)).toBeTruthy();
  const schemaOptions = bqOptions.filter((opt) => opt.optionType === AutocompleteOptionType.SCHEMA);
  expect(schemaOptions.length).toEqual(2);
  expect(schemaOptions[0].value).toEqual("`my-project.sch1.");
});

test("autocomplete when bigquery table completion with schema", () => {
  const sql = "SELECT * FROM `sch1.A";
  const bqOptions = bqAutocomplete.autocomplete(sql);
  expect(containsOptionType(bqOptions, AutocompleteOptionType.TABLE)).toBeTruthy();
  const tableOptions = bqOptions.filter((opt) => opt.optionType === AutocompleteOptionType.TABLE);
  expect(tableOptions.length).toEqual(1);
  expect(tableOptions[0].value).toEqual("tbl1-A`");
});

test("autocomplete when bigquery table completion with project and schema", () => {
  const sql = "SELECT * FROM `your-project.sch3.-b";
  const bqOptions = bqAutocomplete.autocomplete(sql);
  expect(containsOptionType(bqOptions, AutocompleteOptionType.TABLE)).toBeTruthy();
  const tableOptions = bqOptions.filter((opt) => opt.optionType === AutocompleteOptionType.TABLE);
  expect(tableOptions.length).toEqual(1);
  expect(tableOptions[0].value).toEqual("tbl1-B`");
});

test("autocomplete when bigquery table completion without project and schema", () => {
  const sql = "SELECT * FROM tbl2";
  const bqOptions = bqAutocomplete.autocomplete(sql);
  expect(containsOptionType(bqOptions, AutocompleteOptionType.TABLE)).toBeTruthy();
  const tableOptions = bqOptions.filter((opt) => opt.optionType === AutocompleteOptionType.TABLE);
  expect(tableOptions.length).toEqual(2);
  expect(tableOptions[0].value).toEqual("`my-project.sch2.tbl2`");
});

test("autocomplete when bigquery ignore grave note", () => {
  const sql = "SELECT count(*) FROM `my-project.";
  const bqOptions = bqAutocomplete.autocomplete(sql);
  expect(bqOptions.filter((opt) => opt.value === "`").length).toEqual(0);
});
