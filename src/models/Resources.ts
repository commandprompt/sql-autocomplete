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

export class View {
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
  views: View[];

  constructor(name: string, tables: Table[], views: View[]) {
    this.name = name;
    this.tables = tables;
    this.views = views;

    this.tables.forEach((t) => t.setSchema(this));
    this.views.forEach((v) => v.setSchema(this));
  }

  getName(): string {
    return this.name;
  }

  getFullName(): string {
    return this.getName();
  }

  getTables(): Table[] {
    return this.tables;
  }

  getViews(): View[] {
    return this.views;
  }
}

export class SchemaManager {
  schemas: Schema[];

  constructor(rawSchemas: any[]) {
    this.schemas = this.initializeSchemas(rawSchemas);
  }

  private initializeSchemas(rawSchemas: any[]): Schema[] {
    return rawSchemas.map((schema) => {
      const tables = schema.tables.map((table) => {
        const columns = table.columns.map((col) => new Column(col));
        return new Table(table.name, columns);
      });

      const views = schema.views.map((view) => {
        const columns = view.columns.map((col) => new Column(col));
        return new View(view.name, columns);
      });

      return new Schema(schema.name, tables, views);
    });
  }

  getAllSchemaNames(): string[] {
    return this.schemas.map((schema) => schema.getName());
  }

  getAllTableNames(): string[] {
    return this.schemas.flatMap((schema) =>
      schema.getTables().map((table) => table.getName())
    );
  }

  getAllViewNames(): string[] {
    return this.schemas.flatMap((schema) =>
      schema.getViews().map((view) => view.getName())
    );
  }

  getAllColumnNames(): string[] {
    return this.schemas.flatMap((schema) => [
      ...schema
        .getTables()
        .flatMap((table) => table.columns.map((column) => column.getName())),
      ...schema
        .getViews()
        .flatMap((view) => view.columns.map((column) => column.getName())),
    ]);
  }

  getTableNamesFromSchema(schemaName: string): string[] {
    const schema = this.schemas.find(
      (schema) => schema.getName() === schemaName
    );
    return schema ? schema.getTables().map((table) => table.getName()) : [];
  }

  getViewNamesFromSchema(schemaName: string): string[] {
    const schema = this.schemas.find(
      (schema) => schema.getName() === schemaName
    );
    return schema ? schema.getViews().map((table) => table.getName()) : [];
  }

  getAllColumns(): string[] {
    return this.schemas.flatMap((schema) => [
      ...schema
        .getTables()
        .flatMap((table) => table.columns.map((col) => col.getName())),
      ...schema
        .getViews()
        .flatMap((view) => view.columns.map((col) => col.getName())),
    ]);
  }

  getColumnsFromTableOrView(tableName: string): string[] {
    for (const schema of this.schemas) {
      const table = schema
        .getTables()
        .find((table) => table.getName() === tableName);
      if (table) return table.columns.map((col) => col.getName());

      const view = schema
        .getViews()
        .find((view) => view.getName() === tableName);
      if (view) return view.columns.map((col) => col.getName());
    }
    return [];
  }
}
