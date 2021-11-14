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
import { Schema } from "./models/Schema";

export class SQLAutocomplete {
  dialect: SQLDialect;
  antlr4tssql: antlr4tsSQL;

  schemaNames: string[] = [];
  schemas: Schema[] = [];

  constructor(dialect: SQLDialect, schemas?: Schema[]) {
    this.dialect = dialect;
    this.antlr4tssql = new antlr4tsSQL(this.dialect);
    if (schemas !== null && schemas !== undefined) {
      this.schemas.push(...schemas);
      this.schemaNames.push(...schemas.map((v) => v.name));
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
    const preferredRuleOptions = [
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
    for (const preferredRules of preferredRuleOptions) {
      core.preferredRules = new Set(preferredRules);
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
          (candidateTokenValue.startsWith(tokenString.toUpperCase()) &&
            autocompleteOptions.find(
              (option) => option.value === candidateTokenValue
            ) === undefined)
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
        // if (preferredRulesSchema.includes(rule[0])) {
        //   isSchemaCandidatePosition = true;
        // }
        if (preferredRulesTable.includes(rule[0])) {
          isTableCandidatePosition = true;
        }
        if (preferredRulesColumn.includes(rule[0])) {
          isColumnCandidatePosition = true;
        }
      }
    }

    // if (isSchemaCandidatePosition) {
    //   for (const schemaName of this.schemaNames) {
    //     if (schemaName.toUpperCase().startsWith(tokenString.toUpperCase())) {
    //       autocompleteOptions.unshift(
    //         new AutocompleteOption(schemaName, AutocompleteOptionType.SCHEMA)
    //       );
    //     }
    //   }
    //   if (
    //     autocompleteOptions.length === 0 ||
    //     autocompleteOptions[0].optionType !== AutocompleteOptionType.SCHEMA
    //   ) {
    //     // If none of the table options match, still identify this as a potential table location
    //     autocompleteOptions.unshift(
    //       new AutocompleteOption(null, AutocompleteOptionType.SCHEMA)
    //     );
    //   }
    // }

    if (isTableCandidatePosition) {
      const [tableCompletions, isTable] = this._getTableCompletions(
        tokenIndex,
        tokenString,
        allTokens,
        sqlScript,
        indexToAutocomplete
      );
      if (isTable) {
        // Use only table names when we can suggest tables.
        // The reason above is that at "schema_name.part_of_table_name" situation, there are no suggestion candidates except table names.
        return tableCompletions;
      } else if (tableCompletions.length > 0) {
        autocompleteOptions.splice(0, 0, ...tableCompletions);
      }
    }

    // Original codes
    // if (isTableCandidatePosition) {
    //   for (const tableName of this.tableNames) {
    //     if (tableName.toUpperCase().startsWith(tokenString.toUpperCase())) {
    //       autocompleteOptions.unshift(
    //         new AutocompleteOption(tableName, AutocompleteOptionType.TABLE)
    //       );
    //     }
    //   }
    //   if (
    //     autocompleteOptions.length === 0 ||
    //     autocompleteOptions[0].optionType !== AutocompleteOptionType.TABLE
    //   ) {
    //     // If none of the table options match, still identify this as a potential table location
    //     autocompleteOptions.unshift(
    //       new AutocompleteOption(null, AutocompleteOptionType.TABLE)
    //     );
    //   }
    // }
    // if (isColumnCandidatePosition) {
    //   for (const columnName of this.columnNames) {
    //     if (columnName.toUpperCase().startsWith(tokenString.toUpperCase())) {
    //       autocompleteOptions.unshift(
    //         new AutocompleteOption(columnName, AutocompleteOptionType.COLUMN)
    //       );
    //     }
    //   }
    //   if (
    //     autocompleteOptions.length === 0 ||
    //     autocompleteOptions[0].optionType !== AutocompleteOptionType.COLUMN
    //   ) {
    //     // If none of the column options match, still identify this as a potential column location
    //     autocompleteOptions.unshift(
    //       new AutocompleteOption(null, AutocompleteOptionType.COLUMN)
    //     );
    //   }
    // }
    return autocompleteOptions;
  }

  _getTableCompletions(
    tokenIndex: number,
    tokenString: string,
    allTokens: CommonTokenStream,
    sqlScript: string,
    indexToAutocomplete: number
  ): [AutocompleteOption[], boolean] {
    // Return true as second return value if completion types are tables.
    let tokenPos = tokenIndex;
    tokenPos--;
    let beforeTokenString = this._getTokenString(
      allTokens.getTokens()[tokenPos],
      sqlScript,
      indexToAutocomplete
    );
    if (beforeTokenString !== ".") {
      // Complete schema names
      const options = [];
      for (const schema of this.schemas) {
        if (schema.name.toUpperCase().startsWith(tokenString.toUpperCase())) {
          options.push(
            new AutocompleteOption(schema.name, AutocompleteOptionType.SCHEMA)
          );
        }
      }
      return [options, false];
    }

    // Complete table names
    tokenPos--;
    const schemaTokenString = this._getTokenString(
      allTokens.getTokens()[tokenPos],
      sqlScript,
      indexToAutocomplete
    );
    const currentSchemas = this.schemas.filter(
      (s) => s.name === schemaTokenString
    );
    if (currentSchemas.length === 0) {
      // No such schema
      return [[], false];
    }
    const options = [];
    const currentSchema = currentSchemas[0];
    for (const table of currentSchema.tables) {
      // Complete all tables if current token is "."
      if (table.name.toUpperCase().startsWith(tokenString.toUpperCase())) {
        // CodeMirror Editor cannot recognize dot token
        // TODO: FIX
        options.push(
          new AutocompleteOption("." + table.name, AutocompleteOptionType.TABLE)
        );
      }
    }
    return [options, true];
  }

  // setTableNames(tableNames: string[]): void {
  //   if (tableNames !== null && tableNames !== undefined) {
  //     this.tableNames = [...tableNames];
  //   }
  // }

  // setColumnNames(columnNames: string[]): void {
  //   if (columnNames !== null && columnNames !== undefined) {
  //     this.columnNames = [...columnNames];
  //   }
  // }

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
    if (this.dialect === SQLDialect.TSQL) {
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

  _getPreferredRulesForSchema(): number[] {
    if (this.dialect === SQLDialect.BigQuery) {
      return [
        BigQueryGrammar.BigQueryParser.RULE_table_name,
        BigQueryGrammar.BigQueryParser.RULE_table_name_with_hint,
        BigQueryGrammar.BigQueryParser.RULE_full_table_name,
        BigQueryGrammar.BigQueryParser.RULE_table_source,
      ];
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
      return [
        PlSQLGrammar.PlSqlParser.RULE_tableview_name,
        PlSQLGrammar.PlSqlParser.RULE_table_element,
      ];
    } else if (this.dialect === SQLDialect.PLpgSQL) {
      return [
        PLpgSQLGrammar.PLpgSQLParser.RULE_schema_qualified_name,
        PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_var,
      ];
    } else if (this.dialect === SQLDialect.BigQuery) {
      return [
        BigQueryGrammar.BigQueryParser.RULE_table_name,
        BigQueryGrammar.BigQueryParser.RULE_table_name_with_hint,
        BigQueryGrammar.BigQueryParser.RULE_full_table_name,
        BigQueryGrammar.BigQueryParser.RULE_table_source,
      ];
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
      return [
        PlSQLGrammar.PlSqlParser.RULE_column_name,
        PlSQLGrammar.PlSqlParser.RULE_general_element,
      ];
    } else if (this.dialect === SQLDialect.PLpgSQL) {
      return [
        PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_var,
        PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_identifier,
      ];
    } else if (this.dialect === SQLDialect.BigQuery) {
      return [
        BigQueryGrammar.BigQueryParser.RULE_column_elem,
        BigQueryGrammar.BigQueryParser.RULE_column_alias,
        BigQueryGrammar.BigQueryParser.RULE_full_column_name,
        BigQueryGrammar.BigQueryParser.RULE_output_column_name,
        BigQueryGrammar.BigQueryParser.RULE_column_declaration,
      ];
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
}
