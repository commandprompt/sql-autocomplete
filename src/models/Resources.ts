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

export class BigQueryProjects {
  projects: Project[];
  defaultProject: Project;
  projectNameToProject: Map<string, Project> = new Map();

  constructor(projects: Project[], defaultProjectName: string) {
    this.projects = projects;
    for (const pj of projects) {
      this.projectNameToProject.set(pj.name, pj);
    }
    this.defaultProject = this.projectNameToProject.get(defaultProjectName);
  }

  listMatchedResources(name: string): [Table[], Schema[], Project[]] {
    return [this.listMatchedTables(name), this.listMatchedSchemas(name), this.listMatchedProjects(name)];
  }

  listMatchedProjects(name: string): Project[] {
    const upName = name.toUpperCase();
    return this.projects.filter((pj) => pj.name.toUpperCase().includes(upName));
  }

  listMatchedSchemas(name: string, projectName?: string): Schema[] {
    const upName = name.toUpperCase();
    let project: Project;
    if (projectName === null || projectName === undefined) {
      project = this.defaultProject;
    } else {
      project = this.projectNameToProject.get(projectName);
    }
    if (project === null || project === undefined) {
      return [];
    }

    return project.schemas.filter((s) => s.name.toUpperCase().includes(upName));
  }

  listMatchedTables(name: string, schemaName?: string, projectName?: string): Table[] {
    const upName = name.toUpperCase();
    let project: Project;
    if (projectName === null || projectName === undefined) {
      project = this.defaultProject;
    } else {
      project = this.projectNameToProject.get(projectName);
    }
    if (project === null || project === undefined) {
      return [];
    }

    let schemas: Schema[];
    if (schemaName === null || schemaName === undefined) {
      schemas = project.schemas;
    } else {
      schemas = project.schemas.filter((s) => s.name === schemaName);
    }
    if (schemas.length < 1) {
      return [];
    }

    const tables = [];
    for (const schema of schemas) {
      for (const table of schema.tables) {
        if (table.name.toUpperCase().includes(upName)) {
          tables.push(table);
        }
      }
    }
    return tables;
  }
}
