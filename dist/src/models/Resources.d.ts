export declare class Column {
    name: string;
    columns: string[] | null;
    table?: Table;
    constructor(name: string, columns?: string[] | null);
    setTable(table: Table): void;
    getName(): string;
    getFullName(): string;
}
export declare class Table {
    name: string;
    columns: Column[];
    schema?: Schema;
    constructor(name: string, columns: Column[]);
    setSchema(schema: Schema): void;
    getName(): string;
    getFullName(): string;
}
export declare class View {
    name: string;
    columns: Column[];
    schema?: Schema;
    constructor(name: string, columns: Column[]);
    setSchema(schema: Schema): void;
    getName(): string;
    getFullName(): string;
}
export declare class Schema {
    name: string;
    tables: Table[];
    views: View[];
    constructor(name: string, tables: Table[], views: View[]);
    getName(): string;
    getFullName(): string;
    getTables(): Table[];
    getViews(): View[];
}
export declare class SchemaManager {
    schemas: Schema[];
    constructor(rawSchemas: any[]);
    private initializeSchemas;
    getAllSchemaNames(): string[];
    getAllTableNames(): string[];
    getAllViewNames(): string[];
    getAllColumnNames(): string[];
    getTableNamesFromSchema(schemaName: string): string[];
    getViewNamesFromSchema(schemaName: string): string[];
    getAllColumns(): string[];
    getColumnsFromTableOrView(tableName: string): string[];
}
