import { antlr4tsSQL, CommonTokenStream, Parser, SQLDialect } from "antlr4ts-sql";
import { AutocompleteOption } from "./models/AutocompleteOption";
export declare class SQLAutocomplete {
    dialect: SQLDialect;
    antlr4tssql: antlr4tsSQL;
    tableNames: string[];
    columnNames: string[];
    constructor(dialect: SQLDialect, tableNames?: string[], columnNames?: string[]);
    autocomplete(sqlScript: string, atIndex?: number): AutocompleteOption[];
    setTableNames(tableNames: string[]): void;
    setColumnNames(columnNames: string[]): void;
    _getTokens(sqlScript: string): CommonTokenStream;
    _getParser(tokens: CommonTokenStream): Parser;
    _tokenizeWhitespace(): boolean;
    _getPreferredRulesForProject(): number[];
    _getPreferredRulesForSchema(): number[];
    _getPreferredRulesForTable(): number[];
    _getPreferredRulesForColumn(): number[];
    _getTokensToIgnore(): number[];
    _getTokenIndexAt(tokens: any[], fullString: string, offset: number): number;
    _getTokenString(token: any, fullString: string, offset: number): string;
}
