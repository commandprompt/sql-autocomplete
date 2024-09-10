"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaManager = exports.Schema = exports.View = exports.Table = exports.Column = void 0;
class Column {
    constructor(name, columns = null) {
        this.name = name;
        this.columns = columns;
    }
    setTable(table) {
        this.table = table;
    }
    getName() {
        return this.name;
    }
    getFullName() {
        return `${this.table.getFullName()}.${this.getName()}`;
    }
}
exports.Column = Column;
class Table {
    constructor(name, columns) {
        this.name = name;
        this.columns = columns;
        this.columns.forEach((c) => c.setTable(this));
    }
    setSchema(schema) {
        this.schema = schema;
    }
    getName() {
        return this.name;
    }
    getFullName() {
        return `${this.schema.getFullName()}.${this.getName()}`;
    }
}
exports.Table = Table;
class View {
    constructor(name, columns) {
        this.name = name;
        this.columns = columns;
        this.columns.forEach((c) => c.setTable(this));
    }
    setSchema(schema) {
        this.schema = schema;
    }
    getName() {
        return this.name;
    }
    getFullName() {
        return `${this.schema.getFullName()}.${this.getName()}`;
    }
}
exports.View = View;
class Schema {
    constructor(name, tables, views) {
        this.name = name;
        this.tables = tables;
        this.views = views;
        this.tables.forEach((t) => t.setSchema(this));
        this.views.forEach((v) => v.setSchema(this));
    }
    getName() {
        return this.name;
    }
    getFullName() {
        return this.getName();
    }
    getTables() {
        return this.tables;
    }
    getViews() {
        return this.views;
    }
}
exports.Schema = Schema;
class SchemaManager {
    constructor(rawSchemas) {
        this.schemas = this.initializeSchemas(rawSchemas);
    }
    initializeSchemas(rawSchemas) {
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
    getAllSchemaNames() {
        return this.schemas.map((schema) => schema.getName());
    }
    getAllTableNames() {
        return this.schemas.flatMap((schema) => schema.getTables().map((table) => table.getName()));
    }
    getAllViewNames() {
        return this.schemas.flatMap((schema) => schema.getViews().map((view) => view.getName()));
    }
    getAllColumnNames() {
        return this.schemas.flatMap((schema) => [
            ...schema
                .getTables()
                .flatMap((table) => table.columns.map((column) => column.getName())),
            ...schema
                .getViews()
                .flatMap((view) => view.columns.map((column) => column.getName())),
        ]);
    }
    getTableNamesFromSchema(schemaName) {
        const schema = this.schemas.find((schema) => schema.getName() === schemaName);
        return schema ? schema.getTables().map((table) => table.getName()) : [];
    }
    getViewNamesFromSchema(schemaName) {
        const schema = this.schemas.find((schema) => schema.getName() === schemaName);
        return schema ? schema.getViews().map((table) => table.getName()) : [];
    }
    getAllColumns() {
        return this.schemas.flatMap((schema) => [
            ...schema
                .getTables()
                .flatMap((table) => table.columns.map((col) => col.getName())),
            ...schema
                .getViews()
                .flatMap((view) => view.columns.map((col) => col.getName())),
        ]);
    }
    getColumnsFromTableOrView(tableName) {
        for (const schema of this.schemas) {
            const table = schema
                .getTables()
                .find((table) => table.getName() === tableName);
            if (table)
                return table.columns.map((col) => col.getName());
            const view = schema
                .getViews()
                .find((view) => view.getName() === tableName);
            if (view)
                return view.columns.map((col) => col.getName());
        }
        return [];
    }
}
exports.SchemaManager = SchemaManager;
//# sourceMappingURL=Resources.js.map