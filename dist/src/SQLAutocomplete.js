"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLAutocomplete = void 0;
const antlr4ts_sql_1 = require("antlr4ts-sql");
const antlr4_c3_1 = require("antlr4-c3");
const AutocompleteOption_1 = require("./models/AutocompleteOption");
const AutocompleteOptionType_1 = require("./models/AutocompleteOptionType");
const SimpleSQLTokenizer_1 = require("./models/SimpleSQLTokenizer");
const Resources_1 = require("./models/Resources");
const constants_1 = require("./models/constants");
class SQLAutocomplete {
    constructor(dialect, schemas) {
        this.dialect = dialect;
        this.antlr4tssql = new antlr4ts_sql_1.antlr4tsSQL(this.dialect);
        this.schemaManager = new Resources_1.SchemaManager(schemas);
        this.aliasMap = new Map(); // Initialize the alias map
    }
    autocomplete(sqlScript, atIndex) {
        //prepare alias map before processing string and giving predictions
        const tokens_all = this._getTokens(sqlScript);
        this._getParser(tokens_all);
        tokens_all.fill();
        this.aliasMap = this._buildAliasMap(tokens_all);
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
            return [];
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
            for (const [tokenType, followOnTokens] of candidates.tokens) {
                let candidateTokenValue = parser.vocabulary.getDisplayName(tokenType);
                if (this.dialect === antlr4ts_sql_1.SQLDialect.MYSQL &&
                    candidateTokenValue.endsWith("_SYMBOL")) {
                    candidateTokenValue = candidateTokenValue.substring(0, candidateTokenValue.length - 7);
                }
                candidateTokenValue = this._trimQuotes(candidateTokenValue);
                for (const followOnToken of followOnTokens) {
                    let followOnTokenValue = parser.vocabulary.getDisplayName(followOnToken);
                    followOnTokenValue = this._trimQuotes(followOnTokenValue);
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
            this._addColumnSuggestions(autocompleteOptions, tokenIndex, tokens, sqlScript, indexToAutocomplete);
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
        return constants_1.preferredRulesForSchema[this.dialect] || [];
    }
    _getPreferredRulesForTable() {
        return constants_1.preferredRulesForTable[this.dialect] || [];
    }
    _getPreferredRulesForColumn() {
        return constants_1.preferredRulesForColumn[this.dialect] || [];
    }
    _getPreferredRulesForView() {
        return constants_1.preferredRulesForView[this.dialect] || [];
    }
    _getTokensToIgnore() {
        return constants_1.tokensToIgnore[this.dialect] || [];
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
            const tokenList = tokens.getTokens();
            const currentToken = tokenList[tokenIndex];
            const previousToken = tokenList[tokenIndex - 1];
            const tokenBeforePrevious = tokenList[tokenIndex - 2];
            // Case 1: Current token is DOT, previous is IDENTIFIER
            const isCurrentTokenDot = this._isDotToken(currentToken === null || currentToken === void 0 ? void 0 : currentToken.type);
            const isPreviousTokenIdentifier = this._isIdentifierToken(previousToken === null || previousToken === void 0 ? void 0 : previousToken.type);
            if (isCurrentTokenDot && isPreviousTokenIdentifier) {
                tables = this.schemaManager.getTableNamesFromSchema(previousToken.text);
            }
            // Case 2: Current token is IDENTIFIER, previous is DOT, and one before is IDENTIFIER
            const isCurrentTokenIdentifier = this._isIdentifierToken(currentToken === null || currentToken === void 0 ? void 0 : currentToken.type);
            const isPreviousTokenDot = this._isDotToken(previousToken === null || previousToken === void 0 ? void 0 : previousToken.type);
            const isTokenBeforePreviousIsIdentifier = this._isIdentifierToken(tokenBeforePrevious === null || tokenBeforePrevious === void 0 ? void 0 : tokenBeforePrevious.type);
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
            const tokenList = tokens.getTokens();
            const currentToken = tokenList[tokenIndex];
            const previousToken = tokenList[tokenIndex - 1];
            const tokenBeforePrevious = tokenList[tokenIndex - 2];
            // Case 1: Current token is DOT, previous is IDENTIFIER
            const isCurrentTokenDot = this._isDotToken(currentToken === null || currentToken === void 0 ? void 0 : currentToken.type);
            const isPreviousTokenIdentifier = this._isIdentifierToken(previousToken === null || previousToken === void 0 ? void 0 : previousToken.type);
            if (isCurrentTokenDot && isPreviousTokenIdentifier) {
                views = this.schemaManager.getViewNamesFromSchema(previousToken.text);
            }
            // Case 2: Current token is IDENTIFIER, previous is DOT, and one before is IDENTIFIER
            const isCurrentTokenIdentifier = this._isIdentifierToken(currentToken === null || currentToken === void 0 ? void 0 : currentToken.type);
            const isPreviousTokenDot = this._isDotToken(previousToken === null || previousToken === void 0 ? void 0 : previousToken.type);
            const isTokenBeforePreviousIsIdentifier = this._isIdentifierToken(tokenBeforePrevious === null || tokenBeforePrevious === void 0 ? void 0 : tokenBeforePrevious.type);
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
    _addColumnSuggestions(autocompleteOptions, tokenIndex, tokens, sqlScript, indexToAutocomplete) {
        let columns = this.schemaManager.getAllColumns();
        if ([antlr4ts_sql_1.SQLDialect.MYSQL, antlr4ts_sql_1.SQLDialect.PLpgSQL, antlr4ts_sql_1.SQLDialect.SQLITE].includes(this.dialect)) {
            const tokenList = tokens.getTokens();
            if (sqlScript && indexToAutocomplete) {
                tokenIndex = this._getTokenIndexAt(tokenList, sqlScript, indexToAutocomplete);
            }
            const currentToken = tokenList[tokenIndex];
            const previousToken = tokenList[tokenIndex - 1];
            const tokenBeforePrevious = tokenList[tokenIndex - 2];
            // Case 1: Current token is DOT, previous is IDENTIFIER
            const isCurrentTokenDot = this._isDotToken(currentToken === null || currentToken === void 0 ? void 0 : currentToken.type);
            const isPreviousTokenIdentifier = this._isIdentifierToken(previousToken === null || previousToken === void 0 ? void 0 : previousToken.type);
            if (isCurrentTokenDot && isPreviousTokenIdentifier) {
                const tableName = this.aliasMap.get(previousToken.text) || previousToken.text;
                columns = this.schemaManager.getColumnsFromTableOrView(tableName);
            }
            // Case 2: Current token is IDENTIFIER, previous is DOT, and one before is IDENTIFIER
            const isCurrentTokenIdentifier = this._isIdentifierToken(currentToken === null || currentToken === void 0 ? void 0 : currentToken.type);
            const isPreviousTokenDot = this._isDotToken(previousToken === null || previousToken === void 0 ? void 0 : previousToken.type);
            const isTokenBeforePreviousIsIdentifier = this._isIdentifierToken(tokenBeforePrevious === null || tokenBeforePrevious === void 0 ? void 0 : tokenBeforePrevious.type);
            if (isCurrentTokenIdentifier &&
                isPreviousTokenDot &&
                isTokenBeforePreviousIsIdentifier) {
                const tableName = this.aliasMap.get(tokenBeforePrevious.text) ||
                    tokenBeforePrevious.text;
                columns = this.schemaManager.getColumnsFromTableOrView(tableName);
            }
        }
        for (const columnName of columns) {
            autocompleteOptions.unshift(new AutocompleteOption_1.AutocompleteOption(columnName, AutocompleteOptionType_1.AutocompleteOptionType.COLUMN));
        }
        this._addPlaceholderIfEmpty(autocompleteOptions, AutocompleteOptionType_1.AutocompleteOptionType.COLUMN);
    }
    _trimQuotes(value) {
        return value.startsWith("'") && value.endsWith("'")
            ? value.substring(1, value.length - 1)
            : value;
    }
    _isDotToken(tokenType) {
        return constants_1.dotRules.includes(tokenType);
    }
    _isIdentifierToken(tokenType) {
        return constants_1.identifierRules.includes(tokenType);
    }
    _findNextNonWhitespaceToken(tokenList, startIndex) {
        const notWhitespaceRegex = /[^\s]/;
        for (let i = startIndex; i < tokenList.length; i++) {
            const token = tokenList[i];
            if (notWhitespaceRegex.test(token.text)) {
                return { token, index: i };
            }
        }
        return null; // No non-whitespace token found
    }
    _buildAliasMap(tokens) {
        var _a, _b, _c, _d;
        const aliasMap = new Map();
        const tokenList = tokens.getTokens();
        for (let i = 0; i < tokenList.length; i++) {
            const currentToken = tokenList[i];
            const nextToken = this._findNextNonWhitespaceToken(tokenList, i + 1);
            if (!nextToken)
                return aliasMap;
            const afterNextToken = this._findNextNonWhitespaceToken(tokenList, nextToken.index + 1);
            if (!afterNextToken)
                return aliasMap;
            if (currentToken && nextToken && afterNextToken) {
                if (this._isIdentifierToken(currentToken.type) && // table name
                    ((_b = (_a = nextToken === null || nextToken === void 0 ? void 0 : nextToken.token) === null || _a === void 0 ? void 0 : _a.text) === null || _b === void 0 ? void 0 : _b.toUpperCase()) === "AS" && // optional AS keyword
                    this._isIdentifierToken((_c = afterNextToken === null || afterNextToken === void 0 ? void 0 : afterNextToken.token) === null || _c === void 0 ? void 0 : _c.type) // alias name
                ) {
                    aliasMap.set(afterNextToken.token.text, currentToken.text);
                }
                else if (this._isIdentifierToken(currentToken.type) && // table name
                    this._isIdentifierToken((_d = nextToken === null || nextToken === void 0 ? void 0 : nextToken.token) === null || _d === void 0 ? void 0 : _d.type) // alias without AS
                ) {
                    aliasMap.set(nextToken.token.text, currentToken.text);
                }
            }
        }
        return aliasMap;
    }
}
exports.SQLAutocomplete = SQLAutocomplete;
//# sourceMappingURL=SQLAutocomplete.js.map