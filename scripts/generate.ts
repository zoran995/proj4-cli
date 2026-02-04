#!/usr/bin/env node

import { Client, type QueryResult } from "pg";
import fs from "node:fs";
import { Command } from "commander";

type Options = {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  filename: string;
  function: boolean;
  object?: boolean;
};

type SpatialRefRow = {
  srid: number;
  proj4text: string;
};

const program = new Command();

program
  .name("proj4-cli-defs")
  .description("Generate proj4js EPSG definitions from PostGIS database")
  .version("1.0.0")
  .option("-H, --host <host>", "PostGIS database host", "localhost")
  .option("-p, --port <port>", "Database port", "5432")
  .option("-d, --database <database>", "Database name (required)")
  .option("-u, --username <username>", "Database username", "postgres")
  .option("-w, --password <password>", "Database password (required)")
  .option("-f, --function", "Generate as proj4 function (default: true)", true)
  .option("-o, --object", "Generate as object instead of function")
  .option("-F, --filename <filename>", "Output filename", "epsg.ts")
  .parse();

const options = program.opts<Options>();

if (!options.database) {
  console.error("Error: Database name is required (use -d or --database)");
  process.exit(1);
}

if (!options.password) {
  console.error("Error: Database password is required (use -w or --password)");
  process.exit(1);
}

const proj4function = options.object ? false : options.function;

const client = new Client({
  host: options.host,
  port: parseInt(options.port),
  database: options.database,
  user: options.username,
  password: options.password,
});

client.connect();

client.query<SpatialRefRow>(
  `SELECT srid,trim(proj4text) as proj4text from spatial_ref_sys where proj4text != '';`,
  (err, res: QueryResult<SpatialRefRow>) => {
    if (err) {
      console.error("Database error:", err);
      client.end();
      process.exit(1);
    }

    let stringData = "";

    if (proj4function) {
      stringData =
        "export default function (Proj4js: { defs: (name: string, projection: string) => void }) {\r\n";
      res.rows.forEach((row) => {
        stringData += `  Proj4js.defs("EPSG:${row.srid}", "${row.proj4text}");\r\n`;
      });
      stringData += "}";
    } else {
      stringData = "export const proj4def: Record<number, string> = {\r\n";
      res.rows.forEach((row) => {
        stringData += `  ${row.srid}: "${row.proj4text}",\r\n`;
      });
      stringData += "}";
    }

    fs.writeFileSync(options.filename, stringData);
    console.log(`Successfully generated ${options.filename}`);

    client.end();
  },
);
