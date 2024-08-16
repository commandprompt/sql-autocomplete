export class Column {
  name: string;
  columns: string[] | null;
  table?: Table;

  constructor(name: string, columns: string[] | null = null) {
    this.name = name;
    this.columns = columns;
  }

  setTable(table: Table) {
    this.table = table;
  }

  getName(): string {
    return this.name;
  }

  getFullName(): string {
    return `${this.table.getFullName()}.${this.getName()}`;
  }
}

export class Table {
  name: string;
  columns: Column[];
  schema?: Schema;

  constructor(name: string, columns: Column[]) {
    this.name = name;
    this.columns = columns;
    this.columns.forEach((c) => c.setTable(this));
  }

  setSchema(schema: Schema) {
    this.schema = schema;
  }

  getName(): string {
    return this.name;
  }

  getFullName(): string {
    return `${this.schema.getFullName()}.${this.getName()}`;
  }
}

export class Schema {
  name: string;
  tables: Table[];
  project?: Project;

  constructor(name: string, tables: Table[]) {
    this.name = name;
    this.tables = tables;
    this.tables.forEach((t) => t.setSchema(this));
  }

  setProject(project: Project) {
    this.project = project;
  }

  getName(): string {
    return this.name;
  }

  getFullName(): string {
    return `${this.project.getName()}.${this.getName()}`;
  }
}

export class Project {
  name: string;
  schemas: Schema[];

  constructor(name: string, schemas: Schema[]) {
    this.name = name;
    this.schemas = schemas;
    this.schemas.forEach((s) => s.setProject(this));
  }

  getName(): string {
    return this.name;
  }
}

