import { SQLDialect } from "antlr4ts-sql";

export enum ExtendedSQLDialect {
  MYSQL = "MySQL",
  TSQL = "TSQL",
  PLSQL = "PLSQL",
  PLpgSQL = "PLpgSQL",
  BigQuery = "BigQuery",
}

export function toAntlrDialect(d: ExtendedSQLDialect): SQLDialect {
  switch (d) {
    case ExtendedSQLDialect.MYSQL:
      return SQLDialect.MYSQL;
    case ExtendedSQLDialect.TSQL:
      return SQLDialect.TSQL;
    case ExtendedSQLDialect.PLSQL:
      return SQLDialect.PLSQL;
    case ExtendedSQLDialect.PLpgSQL:
      return SQLDialect.PLpgSQL;
    case ExtendedSQLDialect.BigQuery:
      return SQLDialect.TSQL;
  }
}
