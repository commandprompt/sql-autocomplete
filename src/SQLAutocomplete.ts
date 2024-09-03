import {
  antlr4tsSQL,
  CommonTokenStream,
  PredictionMode,
  MySQLGrammar,
  Parser,
  PLpgSQLGrammar,
  PlSQLGrammar,
  SQLDialect,
  Token,
  SQLiteGrammar,
} from "antlr4ts-sql";
import { CodeCompletionCore } from "antlr4-c3";
import { AutocompleteOption } from "./models/AutocompleteOption";
import { AutocompleteOptionType } from "./models/AutocompleteOptionType";
import { SimpleSQLTokenizer } from "./models/SimpleSQLTokenizer";

export class SQLAutocomplete {
  dialect: SQLDialect;
  antlr4tssql: antlr4tsSQL;
  tableNames: string[] = [];
  columnNames: string[] = [];
  viewNames: string[] = [];
  schemaNames: string[] = [];

  constructor(
    dialect: SQLDialect,
    tableNames?: string[],
    columnNames?: string[],
    viewNames?: string[],
    schemaNames?: string[]
  ) {
    this.dialect = dialect;
    this.antlr4tssql = new antlr4tsSQL(this.dialect);
    if (tableNames !== null && tableNames !== undefined) {
      this.tableNames.push(...tableNames);
    }
    if (columnNames !== null && columnNames !== undefined) {
      this.columnNames.push(...columnNames);
    }

    if (viewNames !== null && viewNames !== undefined) {
      this.viewNames.push(...viewNames);
    }

    if (schemaNames !== null && schemaNames !== undefined) {
      this.schemaNames.push(...schemaNames);
    }
  }

  autocomplete(sqlScript: string, atIndex?: number): AutocompleteOption[] {
    if (atIndex !== undefined && atIndex !== null) {
      // Remove everything after the index we want to get suggestions for,
      // it's not needed and keeping it in may impact which token gets selected for prediction
      sqlScript = sqlScript.substring(0, atIndex);
    }
    const tokens = this._getTokens(sqlScript);
    const parser = this._getParser(tokens);
    const core = new CodeCompletionCore(parser);
    const preferredRulesSchema = this._getPreferredRulesForSchema();
    const preferredRulesTable = this._getPreferredRulesForTable();
    const preferredRulesColumn = this._getPreferredRulesForColumn();
    const preferredRulesView = this._getPreferredRulesForView();
    const preferredRuleOptions = [
      preferredRulesSchema,
      preferredRulesTable,
      preferredRulesColumn,
      preferredRulesView,
    ];
    const ignoreTokens = this._getTokensToIgnore();
    core.ignoredTokens = new Set(ignoreTokens);
    let indexToAutocomplete = sqlScript.length;
    if (atIndex !== null && atIndex !== undefined) {
      indexToAutocomplete = atIndex;
    }
    const simpleSQLTokenizer = new SimpleSQLTokenizer(
      sqlScript,
      this._tokenizeWhitespace()
    );
    const allTokens = new CommonTokenStream(simpleSQLTokenizer);
    const tokenIndex = this._getTokenIndexAt(
      allTokens.getTokens(),
      sqlScript,
      indexToAutocomplete
    );
    if (tokenIndex === null) {
      return null;
    }
    const token: any = allTokens.getTokens()[tokenIndex];
    const tokenString = this._getTokenString(
      token,
      sqlScript,
      indexToAutocomplete
    );
    tokens.fill(); // Needed for CoreCompletionCore to process correctly, see: https://github.com/mike-lischke/antlr4-c3/issues/42

    const autocompleteOptions: AutocompleteOption[] = [];
    // Depending on the SQL grammar, we may not get both Tables and Column rules,
    // even if both are viable options for autocompletion
    // So, instead of using all preferredRules at once, we'll do them separate
    let isSchemaCandidatePosition = false;
    let isTableCandidatePosition = false;
    let isColumnCandidatePosition = false;
    let isViewCandidatePosition = false;
    for (const preferredRules of preferredRuleOptions) {
      core.preferredRules = new Set(preferredRules);
      // core.showResult = true;
      // core.showDebugOutput = true;
      // core.showRuleStack = true;
      const candidates = core.collectCandidates(tokenIndex);
      for (const candidateToken of candidates.tokens) {
        let candidateTokenValue = parser.vocabulary.getDisplayName(
          candidateToken[0]
        );
        if (
          this.dialect === SQLDialect.MYSQL &&
          candidateTokenValue.endsWith("_SYMBOL")
        ) {
          candidateTokenValue = candidateTokenValue.substring(
            0,
            candidateTokenValue.length - 7
          );
        }
        if (
          candidateTokenValue.startsWith("'") &&
          candidateTokenValue.endsWith("'")
        ) {
          candidateTokenValue = candidateTokenValue.substring(
            1,
            candidateTokenValue.length - 1
          );
        }
        let followOnTokens = candidateToken[1];
        for (const followOnToken of followOnTokens) {
          let followOnTokenValue =
            parser.vocabulary.getDisplayName(followOnToken);
          if (
            followOnTokenValue.startsWith("'") &&
            followOnTokenValue.endsWith("'")
          ) {
            followOnTokenValue = followOnTokenValue.substring(
              1,
              followOnTokenValue.length - 1
            );
          }
          if (
            !(
              followOnTokenValue.length === 1 &&
              /[^\w\s]/.test(followOnTokenValue)
            )
          ) {
            candidateTokenValue += " ";
          }
          candidateTokenValue += followOnTokenValue;
        }
        if (
          tokenString.length === 0 ||
          autocompleteOptions.find(
            (option) => option.value === candidateTokenValue
          ) === undefined
        ) {
          autocompleteOptions.push(
            new AutocompleteOption(
              candidateTokenValue,
              AutocompleteOptionType.KEYWORD
            )
          );
        }
      }
      for (const rule of candidates.rules) {
        if (preferredRulesSchema.includes(rule[0])) {
          isSchemaCandidatePosition = true;
        }
        if (preferredRulesTable.includes(rule[0])) {
          isTableCandidatePosition = true;
        }
        if (preferredRulesColumn.includes(rule[0])) {
          isColumnCandidatePosition = true;
        }
        if (preferredRulesView.includes(rule[0])) {
          isViewCandidatePosition = true;
        }
      }
    }

    if (isSchemaCandidatePosition) {
      for (const schemaName of this.schemaNames) {
        autocompleteOptions.unshift(
          new AutocompleteOption(schemaName, AutocompleteOptionType.SCHEMA)
        );
      }
      if (
        autocompleteOptions.length === 0 ||
        autocompleteOptions[0].optionType !== AutocompleteOptionType.SCHEMA
      ) {
        // If none of the schema options match, still identify this as a potential schema location
        autocompleteOptions.unshift(
          new AutocompleteOption(null, AutocompleteOptionType.SCHEMA)
        );
      }
    }

    if (isTableCandidatePosition) {
      for (const tableName of this.tableNames) {
        autocompleteOptions.unshift(
          new AutocompleteOption(tableName, AutocompleteOptionType.TABLE)
        );
      }
      if (
        autocompleteOptions.length === 0 ||
        autocompleteOptions[0].optionType !== AutocompleteOptionType.TABLE
      ) {
        // If none of the table options match, still identify this as a potential table location
        autocompleteOptions.unshift(
          new AutocompleteOption(null, AutocompleteOptionType.TABLE)
        );
      }
    }
    if (isColumnCandidatePosition) {
      for (const columnName of this.columnNames) {
        autocompleteOptions.unshift(
          new AutocompleteOption(columnName, AutocompleteOptionType.COLUMN)
        );
      }
      if (
        autocompleteOptions.length === 0 ||
        autocompleteOptions[0].optionType !== AutocompleteOptionType.COLUMN
      ) {
        // If none of the column options match, still identify this as a potential column location
        autocompleteOptions.unshift(
          new AutocompleteOption(null, AutocompleteOptionType.COLUMN)
        );
      }
    }

    if (isViewCandidatePosition) {
      for (const viewName of this.viewNames) {
        autocompleteOptions.unshift(
          new AutocompleteOption(viewName, AutocompleteOptionType.VIEW)
        );
      }

      if (
        autocompleteOptions.length === 0 ||
        autocompleteOptions[0].optionType !== AutocompleteOptionType.VIEW
      ) {
        // If none of the view options match, still identify this as a potential view location
        autocompleteOptions.unshift(
          new AutocompleteOption(null, AutocompleteOptionType.VIEW)
        );
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
    if (this.dialect === SQLDialect.PLSQL) {
      return true;
    } else if (this.dialect === SQLDialect.PLpgSQL) {
      return true;
    } else if (this.dialect === SQLDialect.MYSQL) {
      return true;
    }
    return true;
  }

  _getPreferredRulesForSchema(): number[] {
    if (this.dialect === SQLDialect.PLpgSQL) {
      return [PLpgSQLGrammar.PLpgSQLParser.RULE_schema_qualified_name];
    } else if (this.dialect === SQLDialect.MYSQL) {
      return [
        MySQLGrammar.MultiQueryMySQLParser.RULE_schemaRef,
        MySQLGrammar.MultiQueryMySQLParser.RULE_tableRef,
        MySQLGrammar.MultiQueryMySQLParser.RULE_fieldIdentifier,
      ];
    }
    return [];
  }

  _getPreferredRulesForTable(): number[] {
    if (this.dialect === SQLDialect.MYSQL) {
      return [
        MySQLGrammar.MultiQueryMySQLParser.RULE_tableRef,
        MySQLGrammar.MultiQueryMySQLParser.RULE_fieldIdentifier,
        MySQLGrammar.MultiQueryMySQLParser.RULE_createView,
      ];
    } else if (this.dialect === SQLDialect.PLSQL) {
      return [
        PlSQLGrammar.PlSqlParser.RULE_tableview_name,
        PlSQLGrammar.PlSqlParser.RULE_table_element,
      ];
    } else if (this.dialect === SQLDialect.PLpgSQL) {
      return [
        PLpgSQLGrammar.PLpgSQLParser.RULE_schema_qualified_name,
        PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_var,
      ];
    } else if (this.dialect === SQLDialect.SQLITE) {
      return [
        SQLiteGrammar.SQLiteParser.RULE_table_name,
        SQLiteGrammar.SQLiteParser.RULE_create_view_stmt,
      ];
    }
    return [];
  }

  _getPreferredRulesForColumn(): number[] {
    if (this.dialect === SQLDialect.MYSQL) {
      return [MySQLGrammar.MultiQueryMySQLParser.RULE_columnRef];
    } else if (this.dialect === SQLDialect.PLSQL) {
      return [
        PlSQLGrammar.PlSqlParser.RULE_column_name,
        PlSQLGrammar.PlSqlParser.RULE_general_element,
      ];
    } else if (this.dialect === SQLDialect.PLpgSQL) {
      return [
        PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_var,
        PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_identifier,
      ];
    } else if (this.dialect === SQLDialect.SQLITE) {
      return [
        SQLiteGrammar.SQLiteParser.RULE_column_name,
        SQLiteGrammar.SQLiteParser.RULE_column_alias,
      ];
    }
    return [];
  }

  _getPreferredRulesForView(): number[] {
    if (this.dialect === SQLDialect.SQLITE) {
      return [
        SQLiteGrammar.SQLiteParser.RULE_drop_stmt,
        SQLiteGrammar.SQLiteParser.RULE_select_stmt,
      ];
    } else if (this.dialect === SQLDialect.PLpgSQL) {
      return [PLpgSQLGrammar.PLpgSQLParser.RULE_schema_qualified_name];
    } else if (this.dialect === SQLDialect.MYSQL) {
      return [
        MySQLGrammar.MultiQueryMySQLParser.RULE_dropView,
        MySQLGrammar.MultiQueryMySQLParser.RULE_alterView,
        MySQLGrammar.MultiQueryMySQLParser.RULE_showStatement,
        MySQLGrammar.MultiQueryMySQLParser.RULE_selectStatement,
        MySQLGrammar.MultiQueryMySQLParser.RULE_updateStatement,
        MySQLGrammar.MultiQueryMySQLParser.RULE_insertStatement,
        MySQLGrammar.MultiQueryMySQLParser.RULE_deleteStatement,
        MySQLGrammar.MultiQueryMySQLParser.RULE_renameTableStatement,
        MySQLGrammar.MultiQueryMySQLParser.RULE_alterView,
      ];
    } else if (this.dialect === SQLDialect.PLSQL) {
      return [PlSQLGrammar.PlSqlParser.RULE_tableview_name];
    }
    return [];
  }

  _getTokensToIgnore(): number[] {
    if (this.dialect === SQLDialect.MYSQL) {
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
    } else if (this.dialect === SQLDialect.SQLITE) {
      return [
        SQLiteGrammar.SQLiteParser.DOT,
        SQLiteGrammar.SQLiteParser.COMMA,
        SQLiteGrammar.SQLiteParser.SCOL,
        SQLiteGrammar.SQLiteParser.IDENTIFIER,
        SQLiteGrammar.SQLiteParser.OPEN_PAR,
        SQLiteGrammar.SQLiteParser.CLOSE_PAR,
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
}
