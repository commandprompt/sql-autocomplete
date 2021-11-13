export class Column {
  name: string;
  columns: string[] | null;

  constructor(name: string, columns: string[] | null = null) {
    this.name = name;
    this.columns = columns;
  }
}

export class Table {
  name: string;
  columns: Column[];

  constructor(name: string, columns: Column[]) {
    this.name = name;
    this.columns = columns;
  }
}

export class Schema {
  name: string;
  tables: Table[];

  constructor(name: string, tables: Table[]) {
    this.name = name;
    this.tables = tables;
  }
}
