import { antlr4tsSQL, CommonTokenStream, Parser, SQLDialect } from "antlr4ts-sql";
import { AutocompleteOption } from "./models/AutocompleteOption";
import { SchemaManager } from "./models/Resources";
export declare class SQLAutocomplete {
    dialect: SQLDialect;
    antlr4tssql: antlr4tsSQL;
    schemaManager: SchemaManager;
    constructor(dialect: SQLDialect, schemas: any[]);
    autocomplete(sqlScript: string, atIndex?: number): AutocompleteOption[];
    _getTokens(sqlScript: string): CommonTokenStream;
    _getParser(tokens: CommonTokenStream): Parser;
    _tokenizeWhitespace(): boolean;
    _getPreferredRulesForSchema(): number[];
    _getPreferredRulesForTable(): number[];
    _getPreferredRulesForColumn(): number[];
    _getPreferredRulesForView(): number[];
    _getTokensToIgnore(): number[];
    _getTokenIndexAt(tokens: any[], fullString: string, offset: number): number;
    _getTokenString(token: any, fullString: string, offset: number): string;
}
