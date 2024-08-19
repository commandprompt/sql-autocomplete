import { TokenSource, Token, CharStream, TokenFactory } from "antlr4ts-sql";
/**
 * A very simple tokenizer for splitting a string into tokens based on
 * whitespace. Handles SQL quote characters (i.e. '). Also splits ; and . as separate tokens
 *
 * THIS SHOULD NOT BE USED FOR MOST ANTLR4 TASKS.
 *
 * It is designed to be used to find the correct token index at
 * any string location, regardless of the validity of the SQL string.
 * See SQLAutocomplete.getTokenIndexAt for usage.
 */
export declare class SimpleSQLTokenizer implements TokenSource {
    value: string;
    _currentIndex: number;
    _insideQuote: boolean;
    specialCharacters: string[];
    whitespaceCharacters: string[];
    constructor(value: string, tokenizeWhitespace: boolean);
    nextToken(): Token;
    line: number;
    charPositionInLine: number;
    inputStream: CharStream;
    sourceName: string;
    tokenFactory: TokenFactory;
}
