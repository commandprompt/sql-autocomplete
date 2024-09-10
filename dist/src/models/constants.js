"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.identifierRules = exports.dotRules = exports.preferredRulesForView = exports.preferredRulesForColumn = exports.preferredRulesForTable = exports.preferredRulesForSchema = exports.tokensToIgnore = void 0;
const antlr4ts_sql_1 = require("antlr4ts-sql");
exports.tokensToIgnore = {
    PLpgSQL: [
        antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.DOT,
        antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.COMMA,
        antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.SEMI_COLON,
        antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.DOUBLE_DOT,
        antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.Identifier,
        antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.LEFT_PAREN,
        antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.RIGHT_PAREN,
        antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.LEFT_BRACKET,
        antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.RIGHT_BRACKET,
    ],
    MySQL: [
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.DOT_SYMBOL,
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.COMMA_SYMBOL,
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.SEMICOLON_SYMBOL,
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.IDENTIFIER,
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.OPEN_PAR_SYMBOL,
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.CLOSE_PAR_SYMBOL,
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.OPEN_CURLY_SYMBOL,
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.CLOSE_CURLY_SYMBOL,
    ],
    SQLite: [
        antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.DOT,
        antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.COMMA,
        antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.SCOL,
        antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.IDENTIFIER,
        antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.OPEN_PAR,
        antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.CLOSE_PAR,
    ],
    PLSQL: [
        antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.PERIOD,
        antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.COMMA,
        antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.SEMICOLON,
        antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.DOUBLE_PERIOD,
        antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.IDENTIFIER,
        antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.LEFT_PAREN,
        antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.RIGHT_PAREN,
    ],
};
exports.preferredRulesForSchema = {
    PLpgSQL: [antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.RULE_query_schema_name],
    MySQL: [
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_schemaRef,
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_schemaName,
    ],
    SQLite: [],
    PLSQL: [],
};
exports.preferredRulesForTable = {
    PLpgSQL: [
        antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.RULE_schema_qualified_name,
        antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_var,
    ],
    MySQL: [
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_tableRef,
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_fieldIdentifier,
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_createView,
    ],
    SQLite: [
        antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.RULE_table_name,
        antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.RULE_view_name,
    ],
    PLSQL: [
        antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.RULE_tableview_name,
        antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.RULE_table_element,
    ],
};
exports.preferredRulesForColumn = {
    PLpgSQL: [
        antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_var,
        antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_identifier,
    ],
    MySQL: [
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_columnRef,
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_tableWild,
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_columnName,
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_simpleExpr,
    ],
    SQLite: [
        antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.RULE_column_name,
        antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.RULE_column_alias,
        antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.RULE_result_column,
        antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.RULE_expr,
    ],
    PLSQL: [
        antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.RULE_column_name,
        antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.RULE_general_element,
    ],
};
exports.preferredRulesForView = {
    PLpgSQL: [antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.RULE_schema_qualified_name],
    MySQL: [
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_tableRef,
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_fieldIdentifier,
        antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.RULE_viewRef,
    ],
    SQLite: [
        antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.RULE_any_name,
        antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.RULE_table_name,
    ],
    PLSQL: [antlr4ts_sql_1.PlSQLGrammar.PlSqlParser.RULE_tableview_name],
};
exports.dotRules = [
    antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.DOT_SYMBOL,
    antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.DOT,
    antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.DOT,
];
exports.identifierRules = [
    antlr4ts_sql_1.PLpgSQLGrammar.PLpgSQLParser.Identifier,
    antlr4ts_sql_1.MySQLGrammar.MultiQueryMySQLParser.IDENTIFIER,
    antlr4ts_sql_1.SQLiteGrammar.SQLiteParser.IDENTIFIER,
];
//# sourceMappingURL=constants.js.map