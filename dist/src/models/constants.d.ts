import { SQLDialect } from "antlr4ts-sql";
export declare const tokensToIgnore: Record<SQLDialect, number[]>;
export declare const preferredRulesForSchema: Record<SQLDialect, number[]>;
export declare const preferredRulesForTable: Record<SQLDialect, number[]>;
export declare const preferredRulesForColumn: Record<SQLDialect, number[]>;
export declare const preferredRulesForView: Record<SQLDialect, number[]>;
export declare const dotRules: number[];
export declare const identifierRules: number[];
