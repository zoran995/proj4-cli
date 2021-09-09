#!/usr/bin/env node

var { Client } = require('pg');
var fs = require('fs');
var prompt = require('prompt');

var properties = [
  {
    name: 'host',
    description: 'PostGIS database host',
    default: 'localhost'
  },
  {
    name: 'port',
    type: 'integer',
    description: 'PORT',
    default: 5432
  },
  {
    name: 'database',
    type: 'string',
    description: 'Database name',
    required: true
  },
  {
    name: 'username',
    description: 'Username',
    default: 'postgres',
    required: true
  },
  {
    name: 'password',
    description: 'Password',
    required: true,
    hidden: true,
    replace: '*'
  },
  {
    name: 'proj4function',
    type: 'boolean',
    description: 'Save generated result as proj4 function?',
    default: true
  }
]

var start_epsg = 'Proj4js.defs["EPSG:';
var end_epsg_start_proj4js = '"] = "';
var end_proj4js ='";';

prompt.start();
prompt.get(properties, function (err, result) {
  if (err) { return onErr(err); }
  var client = new Client({
    host: result.host,
    port: result.port,
    database: result.database,
    user: result.username,
    password: result.password
  });
  client.connect();
  client.query(`SELECT srid,trim(proj4text) as proj4text from spatial_ref_sys where proj4text != '';`, function (err, res) {
    if (!err) {
      var stringData = "";
      if (result.proj4function) {
        stringData = "module.exports = function (Proj4js) {\r\n";
        res.rows.map(function(row) {
          stringData = `${stringData}  ${start_epsg}${row.srid}${end_epsg_start_proj4js}${row.proj4text}${end_proj4js}\r\n`
        });
        stringData += "}"
      } else {
        stringData = "export const proj4def: Record<number, string> = {\r\n"
        res.rows.map(function(row) {
          stringData = `${stringData}  ${row.srid}: "${row.proj4text}",\r\n`
        });
        stringData += "}"
      }
      fs.writeFileSync('epsg.ts', stringData);
    } else {
      onErr(err);
    }
    client.end();
  });
});

function onErr(err) {
  console.log(err);
  prompt.stop();
  return 1;
}