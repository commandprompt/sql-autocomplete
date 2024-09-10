import {
  MySQLGrammar,
  PLpgSQLGrammar,
  PlSQLGrammar,
  SQLDialect,
  SQLiteGrammar,
} from "antlr4ts-sql";

export const tokensToIgnore: Record<SQLDialect, number[]> = {
  PLpgSQL: [
    PLpgSQLGrammar.PLpgSQLParser.DOT,
    PLpgSQLGrammar.PLpgSQLParser.COMMA,
    PLpgSQLGrammar.PLpgSQLParser.SEMI_COLON,
    PLpgSQLGrammar.PLpgSQLParser.DOUBLE_DOT,
    PLpgSQLGrammar.PLpgSQLParser.Identifier,
    PLpgSQLGrammar.PLpgSQLParser.LEFT_PAREN,
    PLpgSQLGrammar.PLpgSQLParser.RIGHT_PAREN,
    PLpgSQLGrammar.PLpgSQLParser.LEFT_BRACKET,
    PLpgSQLGrammar.PLpgSQLParser.RIGHT_BRACKET,
  ],
  MySQL: [
    MySQLGrammar.MultiQueryMySQLParser.DOT_SYMBOL,
    MySQLGrammar.MultiQueryMySQLParser.COMMA_SYMBOL,
    MySQLGrammar.MultiQueryMySQLParser.SEMICOLON_SYMBOL,
    MySQLGrammar.MultiQueryMySQLParser.IDENTIFIER,
    MySQLGrammar.MultiQueryMySQLParser.OPEN_PAR_SYMBOL,
    MySQLGrammar.MultiQueryMySQLParser.CLOSE_PAR_SYMBOL,
    MySQLGrammar.MultiQueryMySQLParser.OPEN_CURLY_SYMBOL,
    MySQLGrammar.MultiQueryMySQLParser.CLOSE_CURLY_SYMBOL,
  ],
  SQLite: [
    SQLiteGrammar.SQLiteParser.DOT,
    SQLiteGrammar.SQLiteParser.COMMA,
    SQLiteGrammar.SQLiteParser.SCOL,
    SQLiteGrammar.SQLiteParser.IDENTIFIER,
    SQLiteGrammar.SQLiteParser.OPEN_PAR,
    SQLiteGrammar.SQLiteParser.CLOSE_PAR,
  ],
  PLSQL: [
    PlSQLGrammar.PlSqlParser.PERIOD,
    PlSQLGrammar.PlSqlParser.COMMA,
    PlSQLGrammar.PlSqlParser.SEMICOLON,
    PlSQLGrammar.PlSqlParser.DOUBLE_PERIOD,
    PlSQLGrammar.PlSqlParser.IDENTIFIER,
    PlSQLGrammar.PlSqlParser.LEFT_PAREN,
    PlSQLGrammar.PlSqlParser.RIGHT_PAREN,
  ],
};

export const preferredRulesForSchema: Record<SQLDialect, number[]> = {
  PLpgSQL: [PLpgSQLGrammar.PLpgSQLParser.RULE_query_schema_name],
  MySQL: [
    MySQLGrammar.MultiQueryMySQLParser.RULE_schemaRef,
    MySQLGrammar.MultiQueryMySQLParser.RULE_schemaName,
  ],
  SQLite: [],
  PLSQL: [],
};

export const preferredRulesForTable: Record<SQLDialect, number[]> = {
  PLpgSQL: [
    PLpgSQLGrammar.PLpgSQLParser.RULE_schema_qualified_name,
    PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_var,
  ],
  MySQL: [
    MySQLGrammar.MultiQueryMySQLParser.RULE_tableRef,
    MySQLGrammar.MultiQueryMySQLParser.RULE_fieldIdentifier,
    MySQLGrammar.MultiQueryMySQLParser.RULE_createView,
  ],
  SQLite: [
    SQLiteGrammar.SQLiteParser.RULE_table_name,
    SQLiteGrammar.SQLiteParser.RULE_view_name,
  ],
  PLSQL: [
    PlSQLGrammar.PlSqlParser.RULE_tableview_name,
    PlSQLGrammar.PlSqlParser.RULE_table_element,
  ],
};

export const preferredRulesForColumn: Record<SQLDialect, number[]> = {
  PLpgSQL: [
    PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_var,
    PLpgSQLGrammar.PLpgSQLParser.RULE_indirection_identifier,
  ],
  MySQL: [
    MySQLGrammar.MultiQueryMySQLParser.RULE_columnRef,
    MySQLGrammar.MultiQueryMySQLParser.RULE_tableWild,
    MySQLGrammar.MultiQueryMySQLParser.RULE_columnName,
    MySQLGrammar.MultiQueryMySQLParser.RULE_simpleExpr,
  ],
  SQLite: [
    SQLiteGrammar.SQLiteParser.RULE_column_name,
    SQLiteGrammar.SQLiteParser.RULE_column_alias,
    SQLiteGrammar.SQLiteParser.RULE_result_column,
    SQLiteGrammar.SQLiteParser.RULE_expr,
  ],
  PLSQL: [
    PlSQLGrammar.PlSqlParser.RULE_column_name,
    PlSQLGrammar.PlSqlParser.RULE_general_element,
  ],
};

export const preferredRulesForView: Record<SQLDialect, number[]> = {
  PLpgSQL: [PLpgSQLGrammar.PLpgSQLParser.RULE_schema_qualified_name],
  MySQL: [
    MySQLGrammar.MultiQueryMySQLParser.RULE_tableRef,
    MySQLGrammar.MultiQueryMySQLParser.RULE_fieldIdentifier,
    MySQLGrammar.MultiQueryMySQLParser.RULE_viewRef,
  ],
  SQLite: [
    SQLiteGrammar.SQLiteParser.RULE_any_name,
    SQLiteGrammar.SQLiteParser.RULE_table_name,
  ],
  PLSQL: [PlSQLGrammar.PlSqlParser.RULE_tableview_name],
};

export const dotRules: number[] = [
  MySQLGrammar.MultiQueryMySQLParser.DOT_SYMBOL,
  PLpgSQLGrammar.PLpgSQLParser.DOT,
  SQLiteGrammar.SQLiteParser.DOT,
];

export const identifierRules: number[] = [
  PLpgSQLGrammar.PLpgSQLParser.Identifier,
  MySQLGrammar.MultiQueryMySQLParser.IDENTIFIER,
  SQLiteGrammar.SQLiteParser.IDENTIFIER,
];
