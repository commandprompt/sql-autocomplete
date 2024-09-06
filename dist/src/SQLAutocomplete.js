"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLAutocomplete = void 0;
const antlr4ts_sql_1 = require("antlr4ts-sql");
const antlr4_c3_1 = require("antlr4-c3");
const AutocompleteOption_1 = require("./models/AutocompleteOption");
const AutocompleteOptionType_1 = require("./models/AutocompleteOptionType");
const SimpleSQLTokenizer_1 = require("./models/SimpleSQLTokenizer");
const Resources_1 = require("./models/Resources");
class SQLAutocomplete {
    constructor(dialect, schemas) {
        this.dialect = dialect;
        this.antlr4tssql = new antlr4ts_sql_1.antlr4tsSQL(this.dialect);
        this.schemaManager = new Resources_1.SchemaManager(schemas);
    }
    autocomplete(sqlScript, atIndex) {
        if (atIndex !== undefined && atIndex !== null) {
            // Remove everything after the index we want to get suggestions for,
            // it's not needed and keeping it in may impact which token gets selected for prediction
            sqlScript = sqlScript.substring(0, atIndex);
        }
        const tokens = this._getTokens(sqlScript);
        const parser = this._getParser(tokens);
        const core = new antlr4_c3_1.CodeCompletionCore(parser);
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
        const simpleSQLTokenizer = new SimpleSQLTokenizer_1.SimpleSQLTokenizer(sqlScript, this._tokenizeWhitespace());
        const allTokens = new antlr4ts_sql_1.CommonTokenStream(simpleSQLTokenizer);
        const tokenIndex = this._getTokenIndexAt(allTokens.getTokens(), sqlScript, indexToAutocomplete);
        if (tokenIndex === null) {
            return null;
        }
        const token = allTokens.getTokens()[tokenIndex];
        const tokenString = this._getTokenString(token, sqlScript, indexToAutocomplete);
        tokens.fill(); // Needed for CoreCompletionCore to process correctly, see: https://github.com/mike-lischke/antlr4-c3/issues/42
        const autocompleteOptions = [];
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
                let candidateTokenValue = parser.vocabulary.getDisplayName(candidateToken[0]);
                if (this.dialect === antlr4ts_sql_1.SQLDialect.MYSQL &&
                    candidateTokenValue.endsWith("_SYMBOL")) {
                    candidateTokenValue = candidateTokenValue.substring(0, candidateTokenValue.length - 7);
                }
                if (candidateTokenValue.startsWith("'") &&
                    candidateTokenValue.endsWith("'")) {
                    candidateTokenValue = candidateTokenValue.substring(1, candidateTokenValue.length - 1);
                }
                let followOnTokens = candidateToken[1];
                for (const followOnToken of followOnTokens) {
                    let followOnTokenValue = parser.vocabulary.getDisplayName(followOnToken);
                    if (followOnTokenValue.startsWith("'") &&
                        followOnTokenValue.endsWith("'")) {
                        followOnTokenValue = followOnTokenValue.substring(1, followOnTokenValue.length - 1);
                    }
                    if (!(followOnTokenValue.length === 1 &&
                        /[^\w\s]/.test(followOnTokenValue))) {
                        candidateTokenValue += " ";
                    }
                    candidateTokenValue += followOnTokenValue;
                }
                if (tokenString.length === 0 ||
                    autocompleteOptions.find((option) => option.value === candidateTokenValue) === undefined) {
                    autocompleteOptions.push(new AutocompleteOption_1.AutocompleteOption(candidateTokenValue, AutocompleteOptionType_1.AutocompleteOptionType.KEYWORD));
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
            const schemas = this.schemaManager.getAllSchemaNames();
            for (const schemaName of schemas) {
                autocompleteOptions.unshift(new AutocompleteOption_1.AutocompleteOption(schemaName, AutocompleteOptionType_1.AutocompleteOptionType.SCHEMA));
            }
            this._addPlaceholderIfEmpty(autocompleteOptions, AutocompleteOptionType_1.AutocompleteOptionType.SCHEMA);
        }
        if (isTableCandidatePosition) {
            this._addTableSuggestions(autocompleteOptions, tokenIndex, tokens);
        }
        if (isViewCandidatePosition) {
            this._addViewSuggestions(autocompleteOptions, tokenIndex, tokens);
        }
        if (isColumnCandidatePosition) {
            //TODO implement columns suggestion based on schema or table
            let columns = this.schemaManager.getAllColumns();
            for (const columnName of columns) {
                autocompleteOptions.unshift(new AutocompleteOption_1.AutocompleteOption(columnName, AutocompleteOptionType_1.AutocompleteOptionType.COLUMN));
            }
            this._addPlaceholderIfEmpty(autocompleteOptions, AutocompleteOptionType_1.AutocompleteOptionType.COLUMN);
        }
        return autocompleteOptions;
    }
    _getTokens(sqlScript) {
        const tokens = this.antlr4tssql.getTokens(sqlScript, []);
        return tokens;
    }
    _getParser(tokens) {
        let parser = this.antlr4tssql.getParser(tokens, []);
        parser.interpreter.setPredictionMode(antlr4ts_sql_1.PredictionMode.LL);
        return parser;
    }
    _tokenizeWhitespace() {
        if (this.dialect === antlr4ts_sql_1.SQLDialect.PLSQL) {
            return true;
        }
        else if (this.dialect === antlr4ts_sql_1.SQLDialect.PLpgSQL) {
            return true;
        }
        else if (this.dialect === antlr4ts_sql_1.SQLDialect.MYSQL) {
            return true;
        }
        return true;
    }
    _getPreferredRulesForSchema() {
        if (this.dialect === antlr4ts_sql_1.SQLDialect.PLpgSQL) {
            return [antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.RULE_query_schema_name];
        }
        else if (this.dialect === antlr4ts_sql_1.SQLDialect.MYSQL) {
            return [
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_schemaRef,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_schemaName,
            ];
        }
        return [];
    }
    _getPreferredRulesForTable() {
        if (this.dialect === antlr4ts_sql_1.SQLDialect.MYSQL) {
            return [
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_tableRef,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_fieldIdentifier,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_createView,
            ];
        }
        else if (this.dialect === antlr4ts_sql_1.SQLDialect.PLSQL) {
            return [
                antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.RULE_tableview_name,
                antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.RULE_table_element,
            ];
        }
        else if (this.dialect === antlr4ts_sql_1.SQLDialect.PLpgSQL) {
            return [
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.RULE_schema_qualified_name,
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_var,
            ];
        }
        else if (this.dialect === antlr4ts_sql_1.SQLDialect.SQLITE) {
            return [
                antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.RULE_table_name,
                antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.RULE_create_view_stmt,
            ];
        }
        return [];
    }
    _getPreferredRulesForColumn() {
        if (this.dialect === antlr4ts_sql_1.SQLDialect.MYSQL) {
            return [antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_columnRef];
        }
        else if (this.dialect === antlr4ts_sql_1.SQLDialect.PLSQL) {
            return [
                antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.RULE_column_name,
                antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.RULE_general_element,
            ];
        }
        else if (this.dialect === antlr4ts_sql_1.SQLDialect.PLpgSQL) {
            return [
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_var,
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_identifier,
            ];
        }
        else if (this.dialect === antlr4ts_sql_1.SQLDialect.SQLITE) {
            return [
                antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.RULE_column_name,
                antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.RULE_column_alias,
            ];
        }
        return [];
    }
    _getPreferredRulesForView() {
        if (this.dialect === antlr4ts_sql_1.SQLDialect.SQLITE) {
            return [
                antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.RULE_drop_stmt,
                antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.RULE_select_stmt,
            ];
        }
        else if (this.dialect === antlr4ts_sql_1.SQLDialect.PLpgSQL) {
            return [antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.RULE_schema_qualified_name];
        }
        else if (this.dialect === antlr4ts_sql_1.SQLDialect.MYSQL) {
            return [
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_dropView,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_alterView,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_showStatement,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_selectStatement,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_updateStatement,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_insertStatement,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_deleteStatement,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_renameTableStatement,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_alterView,
            ];
        }
        else if (this.dialect === antlr4ts_sql_1.SQLDialect.PLSQL) {
            return [antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.RULE_tableview_name];
        }
        return [];
    }
    _getTokensToIgnore() {
        if (this.dialect === antlr4ts_sql_1.SQLDialect.MYSQL) {
            return [
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.DOT_SYMBOL,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.COMMA_SYMBOL,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.SEMICOLON_SYMBOL,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.IDENTIFIER,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.OPEN_PAR_SYMBOL,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.CLOSE_PAR_SYMBOL,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.OPEN_CURLY_SYMBOL,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.CLOSE_CURLY_SYMBOL,
            ];
        }
        else if (this.dialect === antlr4ts_sql_1.SQLDialect.PLSQL) {
            return [
                antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.PERIOD,
                antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.COMMA,
                antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.SEMICOLON,
                antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.DOUBLE_PERIOD,
                antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.IDENTIFIER,
                antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.LEFT_PAREN,
                antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.RIGHT_PAREN,
            ];
        }
        else if (this.dialect === antlr4ts_sql_1.SQLDialect.PLpgSQL) {
            return [
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.DOT,
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.COMMA,
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.SEMI_COLON,
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.DOUBLE_DOT,
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.Identifier,
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.LEFT_PAREN,
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.RIGHT_PAREN,
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.LEFT_BRACKET,
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.RIGHT_BRACKET,
            ];
        }
        else if (this.dialect === antlr4ts_sql_1.SQLDialect.SQLITE) {
            return [
                antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.DOT,
                antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.COMMA,
                antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.SCOL,
                antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.IDENTIFIER,
                antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.OPEN_PAR,
                antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.CLOSE_PAR,
            ];
        }
        return [];
    }
    _getTokenIndexAt(tokens, fullString, offset) {
        if (tokens.length === 0) {
            return null;
        }
        let i = 0;
        let lastNonEOFToken = null;
        while (i < tokens.length) {
            const token = tokens[i];
            if (token.type !== antlr4ts_sql_1.Token.EOF) {
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
    _getTokenString(token, fullString, offset) {
        if (token !== null && token.type !== antlr4ts_sql_1.Token.EOF) {
            let stop = token.stop;
            if (offset < stop) {
                stop = offset;
            }
            return fullString.substring(token.start, stop + 1);
        }
        return "";
    }
    _addTableSuggestions(autocompleteOptions, tokenIndex, tokens) {
        let tables = this.schemaManager.getAllTableNames();
        if ([antlr4ts_sql_1.SQLDialect.MYSQL, antlr4ts_sql_1.SQLDialect.PLpgSQL].includes(this.dialect)) {
            // 2 cases
            // select * from public.
            // select * from public.a
            const tokenList = tokens.getTokens();
            const currentToken = tokenList[tokenIndex];
            const previousToken = tokenList[tokenIndex - 1];
            const tokenBeforePrevious = tokenList[tokenIndex - 2];
            // Case 1: Current token is DOT, previous is IDENTIFIER (Schema suggestion)
            const isCurrentTokenDot = [
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.DOT_SYMBOL,
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.DOT,
            ].includes(currentToken.type);
            const isPreviousTokenIdentifier = [
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.Identifier,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.IDENTIFIER,
            ].includes(previousToken.type);
            if (isCurrentTokenDot && isPreviousTokenIdentifier) {
                tables = this.schemaManager.getTableNamesFromSchema(previousToken.text);
            }
            // Case 2: Current token is IDENTIFIER, previous is DOT, and one before is IDENTIFIER (Table.column suggestion)
            const isCurrentTokenIdentifier = [
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.Identifier,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.IDENTIFIER,
            ].includes(currentToken.type);
            const isPreviousTokenDot = [
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.DOT_SYMBOL,
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.DOT,
            ].includes(previousToken.type);
            const isTokenBeforePreviousIsIdentifier = [
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.Identifier,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.IDENTIFIER,
            ].includes(tokenBeforePrevious.type);
            if (isCurrentTokenIdentifier &&
                isPreviousTokenDot &&
                isTokenBeforePreviousIsIdentifier) {
                const schemaName = tokenBeforePrevious.text;
                tables = this.schemaManager.getTableNamesFromSchema(schemaName);
            }
        }
        for (const tableName of tables) {
            autocompleteOptions.unshift(new AutocompleteOption_1.AutocompleteOption(tableName, AutocompleteOptionType_1.AutocompleteOptionType.TABLE));
        }
        this._addPlaceholderIfEmpty(autocompleteOptions, AutocompleteOptionType_1.AutocompleteOptionType.TABLE);
    }
    _addViewSuggestions(autocompleteOptions, tokenIndex, tokens) {
        let views = this.schemaManager.getAllViewNames();
        if ([antlr4ts_sql_1.SQLDialect.MYSQL, antlr4ts_sql_1.SQLDialect.PLpgSQL].includes(this.dialect)) {
            // 2 cases
            // select * from public.
            // select * from public.a
            const tokenList = tokens.getTokens();
            const currentToken = tokenList[tokenIndex];
            const previousToken = tokenList[tokenIndex - 1];
            const tokenBeforePrevious = tokenList[tokenIndex - 2];
            // Case 1: Current token is DOT, previous is IDENTIFIER (Schema suggestion)
            const isCurrentTokenDot = [
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.DOT_SYMBOL,
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.DOT,
            ].includes(currentToken.type);
            const isPreviousTokenIdentifier = [
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.Identifier,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.IDENTIFIER,
            ].includes(previousToken.type);
            if (isCurrentTokenDot && isPreviousTokenIdentifier) {
                views = this.schemaManager.getViewNamesFromSchema(previousToken.text);
            }
            // Case 2: Current token is IDENTIFIER, previous is DOT, and one before is IDENTIFIER (Table.column suggestion)
            const isCurrentTokenIdentifier = [
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.Identifier,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.IDENTIFIER,
            ].includes(currentToken.type);
            const isPreviousTokenDot = [
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.DOT_SYMBOL,
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.DOT,
            ].includes(previousToken.type);
            const isTokenBeforePreviousIsIdentifier = [
                antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.Identifier,
                antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.IDENTIFIER,
            ].includes(tokenBeforePrevious.type);
            if (isCurrentTokenIdentifier &&
                isPreviousTokenDot &&
                isTokenBeforePreviousIsIdentifier) {
                const schemaName = tokenBeforePrevious.text;
                views = this.schemaManager.getViewNamesFromSchema(schemaName);
            }
        }
        for (const viewName of views) {
            autocompleteOptions.unshift(new AutocompleteOption_1.AutocompleteOption(viewName, AutocompleteOptionType_1.AutocompleteOptionType.VIEW));
        }
        this._addPlaceholderIfEmpty(autocompleteOptions, AutocompleteOptionType_1.AutocompleteOptionType.VIEW);
    }
    _addPlaceholderIfEmpty(autocompleteOptions, optionType) {
        if (autocompleteOptions.length === 0 ||
            autocompleteOptions[0].optionType !== optionType) {
            // If none of the options match, still identify this as a potential location
            autocompleteOptions.unshift(new AutocompleteOption_1.AutocompleteOption(null, optionType));
        }
    }
}
exports.SQLAutocomplete = SQLAutocomplete;
//# sourceMappingURL=SQLAutocomplete.js.map