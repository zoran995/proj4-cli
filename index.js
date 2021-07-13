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
    description: 'PORT',
    default: 5432
  },
  {
    name: 'database',
    description: 'Database name',
    required: true
  },
  {
    name: 'username',
    description: 'Username',
    required: true
  },
  {
    name: 'password',
    description: 'Password',
    required: true,
    hidden: true,
    replace: '*'
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
    password: 'k'
  });
  client.connect();
  client.query(`SELECT srid,trim(proj4text) as proj4text from spatial_ref_sys where proj4text != '';`, function (err, res) {
    if(!err) {
      var stringData = "module.exports = function (Proj4js) {\r\n";
      res.rows.map(function(row) {
        stringData = `  ${stringData}${start_epsg}${row.srid}${end_epsg_start_proj4js}${row.proj4text}${end_proj4js}\r\n`
      });
      stringData += "}"
      fs.writeFileSync('epsg.js', stringData);
    } else {
      onErr(err);
    }
    client.end();
  });
  
});


// 

//prompt.stop();

function onErr(err) {
  console.log(err);
  return 1;
}