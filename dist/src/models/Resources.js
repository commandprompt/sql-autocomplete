"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = exports.Schema = exports.Table = exports.Column = void 0;
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
class Schema {
    constructor(name, tables) {
        this.name = name;
        this.tables = tables;
        this.tables.forEach((t) => t.setSchema(this));
    }
    setProject(project) {
        this.project = project;
    }
    getName() {
        return this.name;
    }
    getFullName() {
        return `${this.project.getName()}.${this.getName()}`;
    }
}
exports.Schema = Schema;
class Project {
    constructor(name, schemas) {
        this.name = name;
        this.schemas = schemas;
        this.schemas.forEach((s) => s.setProject(this));
    }
    getName() {
        return this.name;
    }
}
exports.Project = Project;
//# sourceMappingURL=Resources.js.map