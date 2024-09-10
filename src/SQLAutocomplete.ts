import {
  antlr4tsSQL,
  CommonTokenStream,
  PredictionMode,
  Parser,
  SQLDialect,
  Token,
} from "antlr4ts-sql";
import { CodeCompletionCore } from "antlr4-c3";
import { AutocompleteOption } from "./models/AutocompleteOption";
import { AutocompleteOptionType } from "./models/AutocompleteOptionType";
import { SimpleSQLTokenizer } from "./models/SimpleSQLTokenizer";
import { SchemaManager } from "./models/Resources";
import {
  tokensToIgnore,
  preferredRulesForSchema,
  preferredRulesForTable,
  preferredRulesForColumn,
  preferredRulesForView,
  dotRules,
  identifierRules,
} from "./models/constants";

export class SQLAutocomplete {
  dialect: SQLDialect;
  antlr4tssql: antlr4tsSQL;
  schemaManager: SchemaManager;

  constructor(dialect: SQLDialect, schemas: any[]) {
    this.dialect = dialect;
    this.antlr4tssql = new antlr4tsSQL(this.dialect);
    this.schemaManager = new SchemaManager(schemas);
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
      return [];
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
      for (const [tokenType, followOnTokens] of candidates.tokens) {
        let candidateTokenValue = parser.vocabulary.getDisplayName(tokenType);
        if (
          this.dialect === SQLDialect.MYSQL &&
          candidateTokenValue.endsWith("_SYMBOL")
        ) {
          candidateTokenValue = candidateTokenValue.substring(
            0,
            candidateTokenValue.length - 7
          );
        }
        candidateTokenValue = this._trimQuotes(candidateTokenValue);
        for (const followOnToken of followOnTokens) {
          let followOnTokenValue =
            parser.vocabulary.getDisplayName(followOnToken);

          followOnTokenValue = this._trimQuotes(followOnTokenValue);

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
      const schemas: string[] = this.schemaManager.getAllSchemaNames();
      for (const schemaName of schemas) {
        autocompleteOptions.unshift(
          new AutocompleteOption(schemaName, AutocompleteOptionType.SCHEMA)
        );
      }
      this._addPlaceholderIfEmpty(
        autocompleteOptions,
        AutocompleteOptionType.SCHEMA
      );
    }

    if (isTableCandidatePosition) {
      this._addTableSuggestions(autocompleteOptions, tokenIndex, tokens);
    }
    if (isViewCandidatePosition) {
      this._addViewSuggestions(autocompleteOptions, tokenIndex, tokens);
    }

    if (isColumnCandidatePosition) {
      this._addColumnSuggestions(
        autocompleteOptions,
        tokenIndex,
        tokens,
        sqlScript,
        indexToAutocomplete
      );
    }

    return autocompleteOptions;
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
    return preferredRulesForSchema[this.dialect] || [];
  }

  _getPreferredRulesForTable(): number[] {
    return preferredRulesForTable[this.dialect] || [];
  }

  _getPreferredRulesForColumn(): number[] {
    return preferredRulesForColumn[this.dialect] || [];
  }

  _getPreferredRulesForView(): number[] {
    return preferredRulesForView[this.dialect] || [];
  }

  _getTokensToIgnore(): number[] {
    return tokensToIgnore[this.dialect] || [];
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

  _addTableSuggestions(
    autocompleteOptions: AutocompleteOption[],
    tokenIndex: number,
    tokens: CommonTokenStream
  ): void {
    let tables: string[] = this.schemaManager.getAllTableNames();

    if ([SQLDialect.MYSQL, SQLDialect.PLpgSQL].includes(this.dialect)) {
      const tokenList: Token[] = tokens.getTokens();
      const currentToken: Token = tokenList[tokenIndex];
      const previousToken: Token = tokenList[tokenIndex - 1];
      const tokenBeforePrevious: Token = tokenList[tokenIndex - 2];

      // Case 1: Current token is DOT, previous is IDENTIFIER
      const isCurrentTokenDot = this._isDotToken(currentToken?.type);
      const isPreviousTokenIdentifier = this._isIdentifierToken(
        previousToken?.type
      );

      if (isCurrentTokenDot && isPreviousTokenIdentifier) {
        tables = this.schemaManager.getTableNamesFromSchema(previousToken.text);
      }

      // Case 2: Current token is IDENTIFIER, previous is DOT, and one before is IDENTIFIER
      const isCurrentTokenIdentifier = this._isIdentifierToken(
        currentToken?.type
      );

      const isPreviousTokenDot = this._isDotToken(previousToken?.type);

      const isTokenBeforePreviousIsIdentifier = this._isIdentifierToken(
        tokenBeforePrevious?.type
      );

      if (
        isCurrentTokenIdentifier &&
        isPreviousTokenDot &&
        isTokenBeforePreviousIsIdentifier
      ) {
        const schemaName = tokenBeforePrevious.text;
        tables = this.schemaManager.getTableNamesFromSchema(schemaName);
      }
    }

    for (const tableName of tables) {
      autocompleteOptions.unshift(
        new AutocompleteOption(tableName, AutocompleteOptionType.TABLE)
      );
    }

    this._addPlaceholderIfEmpty(
      autocompleteOptions,
      AutocompleteOptionType.TABLE
    );
  }

  _addViewSuggestions(
    autocompleteOptions: AutocompleteOption[],
    tokenIndex: number,
    tokens: CommonTokenStream
  ): void {
    let views: string[] = this.schemaManager.getAllViewNames();

    if ([SQLDialect.MYSQL, SQLDialect.PLpgSQL].includes(this.dialect)) {
      const tokenList: Token[] = tokens.getTokens();
      const currentToken: Token = tokenList[tokenIndex];
      const previousToken: Token = tokenList[tokenIndex - 1];
      const tokenBeforePrevious: Token = tokenList[tokenIndex - 2];

      // Case 1: Current token is DOT, previous is IDENTIFIER
      const isCurrentTokenDot = this._isDotToken(currentToken?.type);
      const isPreviousTokenIdentifier = this._isIdentifierToken(
        previousToken?.type
      );

      if (isCurrentTokenDot && isPreviousTokenIdentifier) {
        views = this.schemaManager.getViewNamesFromSchema(previousToken.text);
      }

      // Case 2: Current token is IDENTIFIER, previous is DOT, and one before is IDENTIFIER
      const isCurrentTokenIdentifier = this._isIdentifierToken(
        currentToken?.type
      );

      const isPreviousTokenDot = this._isDotToken(previousToken?.type);

      const isTokenBeforePreviousIsIdentifier = this._isIdentifierToken(
        tokenBeforePrevious?.type
      );

      if (
        isCurrentTokenIdentifier &&
        isPreviousTokenDot &&
        isTokenBeforePreviousIsIdentifier
      ) {
        const schemaName = tokenBeforePrevious.text;
        views = this.schemaManager.getViewNamesFromSchema(schemaName);
      }
    }

    for (const viewName of views) {
      autocompleteOptions.unshift(
        new AutocompleteOption(viewName, AutocompleteOptionType.VIEW)
      );
    }

    this._addPlaceholderIfEmpty(
      autocompleteOptions,
      AutocompleteOptionType.VIEW
    );
  }

  _addPlaceholderIfEmpty(
    autocompleteOptions: AutocompleteOption[],
    optionType: AutocompleteOptionType
  ) {
    if (
      autocompleteOptions.length === 0 ||
      autocompleteOptions[0].optionType !== optionType
    ) {
      // If none of the options match, still identify this as a potential location
      autocompleteOptions.unshift(new AutocompleteOption(null, optionType));
    }
  }

  _addColumnSuggestions(
    autocompleteOptions: AutocompleteOption[],
    tokenIndex: number,
    tokens: CommonTokenStream,
    sqlScript?: string,
    indexToAutocomplete?: number
  ) {
    let columns: string[] = this.schemaManager.getAllColumns();

    if (
      [SQLDialect.MYSQL, SQLDialect.PLpgSQL, SQLDialect.SQLITE].includes(
        this.dialect
      )
    ) {
      const tokenList: Token[] = tokens.getTokens();
      if (sqlScript && indexToAutocomplete) {
        tokenIndex = this._getTokenIndexAt(
          tokenList,
          sqlScript,
          indexToAutocomplete
        );
      }
      const currentToken: Token = tokenList[tokenIndex];
      const previousToken: Token = tokenList[tokenIndex - 1];
      const tokenBeforePrevious: Token = tokenList[tokenIndex - 2];

      // Case 1: Current token is DOT, previous is IDENTIFIER
      const isCurrentTokenDot = this._isDotToken(currentToken?.type);
      const isPreviousTokenIdentifier = this._isIdentifierToken(
        previousToken?.type
      );

      if (isCurrentTokenDot && isPreviousTokenIdentifier) {
        columns = this.schemaManager.getColumnsFromTableOrView(
          previousToken.text
        );
      }

      // Case 2: Current token is IDENTIFIER, previous is DOT, and one before is IDENTIFIER
      const isCurrentTokenIdentifier = this._isIdentifierToken(
        currentToken?.type
      );

      const isPreviousTokenDot = this._isDotToken(previousToken?.type);

      const isTokenBeforePreviousIsIdentifier = this._isIdentifierToken(
        tokenBeforePrevious?.type
      );

      if (
        isCurrentTokenIdentifier &&
        isPreviousTokenDot &&
        isTokenBeforePreviousIsIdentifier
      ) {
        const tableName = tokenBeforePrevious.text;
        columns = this.schemaManager.getColumnsFromTableOrView(tableName);
      }
    }

    for (const columnName of columns) {
      autocompleteOptions.unshift(
        new AutocompleteOption(columnName, AutocompleteOptionType.COLUMN)
      );
    }
    this._addPlaceholderIfEmpty(
      autocompleteOptions,
      AutocompleteOptionType.COLUMN
    );
  }

  private _trimQuotes(value: string): string {
    return value.startsWith("'") && value.endsWith("'")
      ? value.substring(1, value.length - 1)
      : value;
  }

  private _isDotToken(tokenType: number): boolean {
    return dotRules.includes(tokenType);
  }

  private _isIdentifierToken(tokenType: number): boolean {
    return identifierRules.includes(tokenType);
  }
}
