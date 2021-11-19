import {
  antlr4tsSQL,
  BigQueryGrammar,
  CommonTokenStream,
  PredictionMode,
  MySQLGrammar,
  Parser,
  PLpgSQLGrammar,
  PlSQLGrammar,
  SQLDialect,
  Token,
  TSQLGrammar,
} from "antlr4ts-sql";
import { CodeCompletionCore } from "antlr4-c3";
import { AutocompleteOption } from "./models/AutocompleteOption";
import { AutocompleteOptionType } from "./models/AutocompleteOptionType";
import { SimpleSQLTokenizer } from "./models/SimpleSQLTokenizer";
import { BigQueryProjects } from "./models/Resources";

export class SQLAutocomplete {
  dialect: SQLDialect;
  antlr4tssql: antlr4tsSQL;
  bigQueryProject?: BigQueryProjects;
  tableNames: string[] = [];
  columnNames: string[] = [];

  constructor(dialect: SQLDialect, bigQueryProjects?: BigQueryProjects, tableNames?: string[], columnNames?: string[]) {
    this.dialect = dialect;
    this.antlr4tssql = new antlr4tsSQL(this.dialect);
    if (tableNames !== null && tableNames !== undefined) {
      this.tableNames.push(...tableNames);
    }
    if (columnNames !== null && columnNames !== undefined) {
      this.columnNames.push(...columnNames);
    }
    if (this.dialect === SQLDialect.BigQuery) {
      if (bigQueryProjects === undefined || bigQueryProjects === null) {
        throw new Error("You must set bigQueryProjects when you use BigQueryDialect.");
      }
      this.bigQueryProject = bigQueryProjects;
    }
  }

  autocomplete(sqlScript: string, atIndex?: number): AutocompleteOption[] {
    if (atIndex !== undefined && atIndex !== null) {
      // Remove everything after the index we want to get suggestions for,
      // it's not needed and keeping it in may impact which token gets selected for prediction
      sqlScript = sqlScript.substring(0, atIndex);
    }
    const withGrave = true;
    const tokens = this._getTokens(sqlScript);
    const parser = this._getParser(tokens);
    const core = new CodeCompletionCore(parser);
    const preferredRulesProject = this._getPreferredRulesForProject();
    const preferredRulesSchema = this._getPreferredRulesForSchema();
    const preferredRulesTable = this._getPreferredRulesForTable();
    const preferredRulesColumn = this._getPreferredRulesForColumn();
    const preferredRuleOptions = [
      preferredRulesProject,
      preferredRulesSchema,
      preferredRulesTable,
      preferredRulesColumn,
    ];
    const ignoreTokens = this._getTokensToIgnore();
    core.ignoredTokens = new Set(ignoreTokens);
    let indexToAutocomplete = sqlScript.length;
    if (atIndex !== null && atIndex !== undefined) {
      indexToAutocomplete = atIndex;
    }
    const simpleSQLTokenizer = new SimpleSQLTokenizer(
      sqlScript,
      this._tokenizeWhitespace(),
      this._getTokenizeGraveNote()
    );
    const allTokens = new CommonTokenStream(simpleSQLTokenizer);
    const tokenIndex = this._getTokenIndexAt(allTokens.getTokens(), sqlScript, indexToAutocomplete);
    if (tokenIndex === null) {
      return null;
    }
    const token: any = allTokens.getTokens()[tokenIndex];
    const tokenString = this._getTokenString(token, sqlScript, indexToAutocomplete);
    tokens.fill(); // Needed for CoreCompletionCore to process correctly, see: https://github.com/mike-lischke/antlr4-c3/issues/42

    const autocompleteOptions: AutocompleteOption[] = [];
    // Depending on the SQL grammar, we may not get both Tables and Column rules,
    // even if both are viable options for autocompletion
    // So, instead of using all preferredRules at once, we'll do them separate
    let isProjectCandidatePosition = false;
    let isSchemaCandidatePosition = false;
    let isTableCandidatePosition = false;
    let isColumnCandidatePosition = false;
    for (const preferredRules of preferredRuleOptions) {
      core.preferredRules = new Set(preferredRules);
      // core.showResult = true;
      // core.showDebugOutput = true;
      // core.showRuleStack = true;
      const candidates = core.collectCandidates(tokenIndex);
      for (const candidateToken of candidates.tokens) {
        let candidateTokenValue = parser.vocabulary.getDisplayName(candidateToken[0]);
        if (this.dialect === SQLDialect.MYSQL && candidateTokenValue.endsWith("_SYMBOL")) {
          candidateTokenValue = candidateTokenValue.substring(0, candidateTokenValue.length - 7);
        }
        if (candidateTokenValue.startsWith("'") && candidateTokenValue.endsWith("'")) {
          candidateTokenValue = candidateTokenValue.substring(1, candidateTokenValue.length - 1);
        }
        let followOnTokens = candidateToken[1];
        for (const followOnToken of followOnTokens) {
          let followOnTokenValue = parser.vocabulary.getDisplayName(followOnToken);
          if (followOnTokenValue.startsWith("'") && followOnTokenValue.endsWith("'")) {
            followOnTokenValue = followOnTokenValue.substring(1, followOnTokenValue.length - 1);
          }
          if (!(followOnTokenValue.length === 1 && /[^\w\s]/.test(followOnTokenValue))) {
            candidateTokenValue += " ";
          }
          candidateTokenValue += followOnTokenValue;
        }
        if (
          tokenString.length === 0 ||
          (candidateTokenValue.startsWith(tokenString.toUpperCase()) &&
            autocompleteOptions.find((option) => option.value === candidateTokenValue) === undefined)
        ) {
          autocompleteOptions.push(new AutocompleteOption(candidateTokenValue, AutocompleteOptionType.KEYWORD));
        }
      }
      for (const rule of candidates.rules) {
        if (preferredRulesProject.includes(rule[0])) {
          isProjectCandidatePosition = true;
        }
        if (preferredRulesSchema.includes(rule[0])) {
          isSchemaCandidatePosition = true;
        }
        if (preferredRulesTable.includes(rule[0])) {
          isTableCandidatePosition = true;
        }
        if (preferredRulesColumn.includes(rule[0])) {
          isColumnCandidatePosition = true;
        }
      }
    }

    if (this.dialect === SQLDialect.BigQuery) {
      // Complete project
      if (isProjectCandidatePosition) {
        const projects = this.bigQueryProject.listMatchedProjects(tokenString);
        // Add "." at the end for usability.
        const projectOptions = projects.map(
          (pj) => new AutocompleteOption(`${pj.getName(withGrave)}.`, AutocompleteOptionType.PROJECT)
        );
        autocompleteOptions.unshift(...projectOptions);
      }

      // Collect input project and schema.
      // values[0] will be schema or project, and values[1] will be schema.
      const values = [];
      let i = 1;
      let expectDot = true;
      while (true) {
        let ts: any = this._getTokenString(allTokens.getTokens()[tokenIndex - i], sqlScript, indexToAutocomplete);
        if (values.length >= 2) {
          break;
        }
        if (ts === "`") {
          i += 1;
          continue;
        }

        if (expectDot && ts === ".") {
          expectDot = false;
          i += 1;
        } else if (!expectDot && ts !== "") {
          values.unshift(ts);
          expectDot = true;
          i += 1;
        } else {
          break;
        }
      }

      // Complete schema
      if (isSchemaCandidatePosition) {
        let currentProject: string = null;
        if (values.length === 1) {
          currentProject = values[0];
        }
        const schemas = this.bigQueryProject.listMatchedSchemas(tokenString, currentProject);
        const schemaOptions = schemas.map(
          (s) =>
            new AutocompleteOption(
              // Add "." at the end for usability.
              // Complete with project if no project set.
              `${currentProject !== null ? s.getName(withGrave) : s.getFullName(withGrave)}.`,
              AutocompleteOptionType.SCHEMA
            )
        );
        autocompleteOptions.unshift(...schemaOptions);
      }

      // Complete table
      if (isTableCandidatePosition) {
        let currentSchema: string = null;
        let currentProject: string = null;
        if (values.length === 1) {
          currentSchema = values[0];
        } else if (values.length === 2) {
          currentProject = values[0];
          currentSchema = values[1];
        }
        const tables = this.bigQueryProject.listMatchedTables(tokenString, currentSchema, currentProject);
        const tableOptions = tables.map(
          (t) =>
            new AutocompleteOption(
              // Complete with project and schema if no project set.
              currentSchema !== null ? t.getName(withGrave) : t.getFullName(withGrave),
              AutocompleteOptionType.TABLE
            )
        );
        autocompleteOptions.unshift(...tableOptions);
      }
    } else {
      if (isTableCandidatePosition) {
        for (const tableName of this.tableNames) {
          if (tableName.toUpperCase().startsWith(tokenString.toUpperCase())) {
            autocompleteOptions.unshift(new AutocompleteOption(tableName, AutocompleteOptionType.TABLE));
          }
        }
        if (autocompleteOptions.length === 0 || autocompleteOptions[0].optionType !== AutocompleteOptionType.TABLE) {
          // If none of the table options match, still identify this as a potential table location
          autocompleteOptions.unshift(new AutocompleteOption(null, AutocompleteOptionType.TABLE));
        }
      }
      if (isColumnCandidatePosition) {
        for (const columnName of this.columnNames) {
          if (columnName.toUpperCase().startsWith(tokenString.toUpperCase())) {
            autocompleteOptions.unshift(new AutocompleteOption(columnName, AutocompleteOptionType.COLUMN));
          }
        }
        if (autocompleteOptions.length === 0 || autocompleteOptions[0].optionType !== AutocompleteOptionType.COLUMN) {
          // If none of the column options match, still identify this as a potential column location
          autocompleteOptions.unshift(new AutocompleteOption(null, AutocompleteOptionType.COLUMN));
        }
      }
    }

    return autocompleteOptions;
  }

  setTableNames(tableNames: string[]): void {
    if (tableNames !== null && tableNames !== undefined) {
      this.tableNames = [...tableNames];
    }
  }

  setColumnNames(columnNames: string[]): void {
    if (columnNames !== null && columnNames !== undefined) {
      this.columnNames = [...columnNames];
    }
  }

  _getTokens(sqlScript: string): CommonTokenStream {
    const tokens = this.antlr4tssql.getTokens(sqlScript, []);
    return tokens;
  }

  _getParser(tokens: CommonTokenStream): Parser {
    let parser = this.antlr4tssql.getParser(tokens, []);
    parser.interpreter.setPredictionMode(PredictionMode.LL);
    return parser;
  }

  _tokenizeWhitespace() {
    if (this.dialect === SQLDialect.TSQL || this.dialect === SQLDialect.BigQuery) {
      return false; // TSQL grammar SKIPs whitespace
    } else if (this.dialect === SQLDialect.PLSQL) {
      return true;
    } else if (this.dialect === SQLDialect.PLpgSQL) {
      return true;
    } else if (this.dialect === SQLDialect.MYSQL) {
      return true;
    }
    return true;
  }

  _getPreferredRulesForProject(): number[] {
    if (this.dialect === SQLDialect.BigQuery) {
      return [BigQueryGrammar.BigQueryParser.RULE_project_name];
    }
    return [];
  }

  _getPreferredRulesForSchema(): number[] {
    if (this.dialect === SQLDialect.BigQuery) {
      return [BigQueryGrammar.BigQueryParser.RULE_dataset_name];
    }
    return [];
  }

  _getPreferredRulesForTable(): number[] {
    if (this.dialect === SQLDialect.TSQL) {
      return [
        TSQLGrammar.TSqlParser.RULE_table_name,
        TSQLGrammar.TSqlParser.RULE_table_name_with_hint,
        TSQLGrammar.TSqlParser.RULE_full_table_name,
        TSQLGrammar.TSqlParser.RULE_table_source,
      ];
    } else if (this.dialect === SQLDialect.MYSQL) {
      return [
        MySQLGrammar.MultiQueryMySQLParser.RULE_tableRef,
        MySQLGrammar.MultiQueryMySQLParser.RULE_fieldIdentifier,
      ];
    } else if (this.dialect === SQLDialect.PLSQL) {
      return [PlSQLGrammar.PlSqlParser.RULE_tableview_name, PlSQLGrammar.PlSqlParser.RULE_table_element];
    } else if (this.dialect === SQLDialect.PLpgSQL) {
      return [
        PLpgSQLGrammar.PLpgSQLParser.RULE_schema_qualified_name,
        PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_var,
      ];
    } else if (this.dialect === SQLDialect.BigQuery) {
      return [BigQueryGrammar.BigQueryParser.RULE_table_name];
    }
    return [];
  }

  _getPreferredRulesForColumn(): number[] {
    if (this.dialect === SQLDialect.TSQL) {
      return [
        TSQLGrammar.TSqlParser.RULE_column_elem,
        TSQLGrammar.TSqlParser.RULE_column_alias,
        TSQLGrammar.TSqlParser.RULE_full_column_name,
        TSQLGrammar.TSqlParser.RULE_output_column_name,
        TSQLGrammar.TSqlParser.RULE_column_declaration,
      ];
    } else if (this.dialect === SQLDialect.MYSQL) {
      return [MySQLGrammar.MultiQueryMySQLParser.RULE_columnRef];
    } else if (this.dialect === SQLDialect.PLSQL) {
      return [PlSQLGrammar.PlSqlParser.RULE_column_name, PlSQLGrammar.PlSqlParser.RULE_general_element];
    } else if (this.dialect === SQLDialect.PLpgSQL) {
      return [
        PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_var,
        PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_identifier,
      ];
    } else if (this.dialect === SQLDialect.BigQuery) {
      return [BigQueryGrammar.BigQueryParser.RULE_column_name];
    }
    return [];
  }

  _getTokensToIgnore(): number[] {
    if (this.dialect === SQLDialect.TSQL) {
      return [
        TSQLGrammar.TSqlParser.DOT,
        TSQLGrammar.TSqlParser.COMMA,
        TSQLGrammar.TSqlParser.ID,
        TSQLGrammar.TSqlParser.LR_BRACKET,
        TSQLGrammar.TSqlParser.RR_BRACKET,
      ];
    } else if (this.dialect === SQLDialect.MYSQL) {
      return [
        MySQLGrammar.MultiQueryMySQLParser.DOT_SYMBOL,
        MySQLGrammar.MultiQueryMySQLParser.COMMA_SYMBOL,
        MySQLGrammar.MultiQueryMySQLParser.SEMICOLON_SYMBOL,
        MySQLGrammar.MultiQueryMySQLParser.IDENTIFIER,
        MySQLGrammar.MultiQueryMySQLParser.OPEN_PAR_SYMBOL,
        MySQLGrammar.MultiQueryMySQLParser.CLOSE_PAR_SYMBOL,
        MySQLGrammar.MultiQueryMySQLParser.OPEN_CURLY_SYMBOL,
        MySQLGrammar.MultiQueryMySQLParser.CLOSE_CURLY_SYMBOL,
      ];
    } else if (this.dialect === SQLDialect.PLSQL) {
      return [
        PlSQLGrammar.PlSqlParser.PERIOD,
        PlSQLGrammar.PlSqlParser.COMMA,
        PlSQLGrammar.PlSqlParser.SEMICOLON,
        PlSQLGrammar.PlSqlParser.DOUBLE_PERIOD,
        PlSQLGrammar.PlSqlParser.IDENTIFIER,
        PlSQLGrammar.PlSqlParser.LEFT_PAREN,
        PlSQLGrammar.PlSqlParser.RIGHT_PAREN,
      ];
    } else if (this.dialect === SQLDialect.PLpgSQL) {
      return [
        PLpgSQLGrammar.PLpgSQLParser.DOT,
        PLpgSQLGrammar.PLpgSQLParser.COMMA,
        PLpgSQLGrammar.PLpgSQLParser.SEMI_COLON,
        PLpgSQLGrammar.PLpgSQLParser.DOUBLE_DOT,
        PLpgSQLGrammar.PLpgSQLParser.Identifier,
        PLpgSQLGrammar.PLpgSQLParser.LEFT_PAREN,
        PLpgSQLGrammar.PLpgSQLParser.RIGHT_PAREN,
        PLpgSQLGrammar.PLpgSQLParser.LEFT_BRACKET,
        PLpgSQLGrammar.PLpgSQLParser.RIGHT_BRACKET,
      ];
    } else if (this.dialect === SQLDialect.BigQuery) {
      return [
        BigQueryGrammar.BigQueryParser.DOT,
        BigQueryGrammar.BigQueryParser.COMMA,
        BigQueryGrammar.BigQueryParser.ID,
        BigQueryGrammar.BigQueryParser.LR_BRACKET,
        BigQueryGrammar.BigQueryParser.RR_BRACKET,
      ];
    }
    return [];
  }

  _getTokenIndexAt(tokens: any[], fullString: string, offset: number): number {
    if (tokens.length === 0) {
      return null;
    }
    let i: number = 0;
    let lastNonEOFToken: number = null;
    while (i < tokens.length) {
      const token = tokens[i];
      if (token.type !== Token.EOF) {
        lastNonEOFToken = i;
      }
      if (token.start > offset) {
        if (i === 0) {
          return null;
        }
        return i - 1;
      }
      i++;
    }
    // If we didn't find the token above and the last
    // character in the autocomplete is whitespace,
    // start autocompleting for the next token
    if (/\s$/.test(fullString)) {
      return i - 1;
    }
    return lastNonEOFToken;
  }

  _getTokenString(token: any, fullString: string, offset: number): string {
    if (token !== null && token.type !== Token.EOF) {
      let stop = token.stop;
      if (offset < stop) {
        stop = offset;
      }
      return fullString.substring(token.start, stop + 1);
    }
    return "";
  }

  _getTokenizeGraveNote(): boolean {
    if (this.dialect === SQLDialect.BigQuery) {
      return true;
    } else {
      return false;
    }
  }
}
