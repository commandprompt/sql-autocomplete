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
export declare class Schema {
    name: string;
    tables: Table[];
    project?: Project;
    constructor(name: string, tables: Table[]);
    setProject(project: Project): void;
    getName(): string;
    getFullName(): string;
}
export declare class Project {
    name: string;
    schemas: Schema[];
    constructor(name: string, schemas: Schema[]);
    getName(): string;
}
