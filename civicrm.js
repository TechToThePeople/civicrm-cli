#!/usr/bin/env node
'use strict';

var program = require('commander');
var prompt = require('prompt');
var fs = require('fs');
var clc = require('cli-color');

var error = clc.red.bold;
var warn = clc.yellow;
var notice = clc.blue;
var success = clc.green;

var crmAPI = null;
var configFile = {path:getUserHome()+'/.config/',name:'civicrm.json'}
var config = {};

program
  .version('0.0.1')
  .option("-s, --site [site]", "alias name for the site")
  .option("-l,--server [url]", "url of the site")
  .option("--api_key [key]", "api key for the user")
  .option("--key [site_key]", "site key");


config= readConfig(configFile);

program
  .command('setup')
  .description('setup the configuration for the site')
  .option("-s, --site [site]", "alias name for the site")
  .option("--url [url]", "url the site")
  .option("--key [key]", "api key for the user")
  .option("--site_key [site_key]", "site key")
  .action(function(){
    var site = program.site || 'default';
    console.log('creating configuration for site %s', site);
    setupSite(site,configFile,{});
});


program
  .option('-l, --limit', 'number of contacts to fetch (default 25)')
.command('csv [search term]')
.description('export the contacts as csv file')
.action(function(q){
  var json2csv = require('json2csv');
  initCiviCRM ();
  console.log(notice('export "%s"', q));
  crmAPI.get ('contact',{sort_name:q,'return':"id,sort_name,email,phone,organization_name"},
    function (result) {
      if (result.is_error) {
        console.log(error("invalid result: "+result.error_message));
        process.exit(1);
      }
      json2csv({data: result.values, fields: ['id', 'sort_name', 'email', 'organization_name']}, function(err, csv) {
        if (err) console.log(err);
        console.log (csv);
    });
  });
});


program
.command('view [contact_id]')
.description('view the detail of a contact')
.action(function(id){
  initCiviCRM ();
  crmAPI.getSingle('contact', {
    "sequential": 1,
    "return": "display_name,organization_name",
    "id": id,
    "api.email.get": {},
    "api.phone.get": {}
  }, function(result) {
   var c=result;
   console.log (success(c.display_name +" from "+c.organization_name));
   c["api.phone.get"].values.forEach(function(val) {
     console.log(" "+val.phone);
   });
   c["api.email.get"].values.forEach(function(val) {
     console.log(" "+val.email);
   });
  });
});


program
  .option('-l, --limit', 'number of contacts to fetch (default 25)')
.command('*')
.description('search the site for contacts')
.action(function(env){
  initCiviCRM ();
  console.log('searching "%s"', env);
  crmAPI.getQuick ('contact',{name:env},
    function (result) {
      if (result.is_error) {
        console.log(error("invalid result: "+result.error_message));
        process.exit(1);
      }
      result.values.forEach(function(val) {
        console.log(val.id +": "+val.sort_name+ " "+val.email+ " "+ val.phone);
      });
    });
});

program.parse(process.argv);



function readConfig(file){
  try {
    var data = fs.readFileSync(file.path+file.name);
  } catch (err) {
    if ("ENOENT" == err.code) {
      if (fs.existsSync(file.path)===false) {
          fs.mkdirSync(file.path,'0700', function (err) { 
            console.log (error("can't create directory "+ file.path));
            process.exit(1);
          });
      }
      fs.writeFileSync(file.path+file.name,"{}",'utf8');
      console.log(warn('No configuration file found, creating a default site'));
      setupSite("default",file,{});
    }
  }

  try {
      var c = JSON.parse(data);
      if (c && c.length ==0) {
        console.log(warn('configuration file '+file.path+file.name +' empty, creating a default site'));
        setupSite("default",file,{});
      }
      return c;
    }
  catch (err) {
    console.log (err);
    console.log(error('No config file or error reading '+file.path+file.name));
  }
  return {};
};

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}


function setupSite(name,file,options) {
//  program.parse(process.argv);
  name = name || "default";
  if (process.site) program.name = process.site; // don't prompt for site name if set from -s [site]
  options.path = options.path ||  '/sites/all/modules/civicrm/extern/rest.php';
  options.server = options.server ||  program.server;
  options.key = options.key ||  program.key;
  options.api_key = options.api_key ||  program.api_key;

  program.path = options.path; //don't ask for path

  prompt.override = program;

  prompt.start();

  prompt.get([{
      name: 'site',
      default: name,
      required: true
    }, {
      name: 'server',
      required: true,
      default: options.server,
      message: 'url of the server eg. https://example.org/',
    }, {
      name: 'path',
      required: true,
      default: options.path
    }, {
      name: 'api_key',
      required: true,
      default: options.api_key,
      message: "api key for the user to run the command as",
       
    }, {
      name: 'key',
      default: options.key,
      message: "site key as defined in your civicrm.setting.php",
      required: true
       
       
    }], function (err, conf) {
      crmAPI = require('civicrm')(conf);
      crmAPI.get ('contact',{contact_type:'Individual',return:'display_name,email,phone'},
        function (result) {
          if (result.is_error) {
            console.log(error("invalid configuration: "+result.error_message));
            console.log(notice("try again: setup -s "+ conf.site + " --server="+ conf.server +" --key="+ conf.key +"--api_key="+conf.api_key));
            process.exit(1);
          }
          config[conf.site] = conf;
          fs.writeFileSync(file.path+file.name,JSON.stringify(config, null, 2),'utf8');
          console.log(success("configuration saved in " + file.path+file.name));
          /*
          for (var i in result.values) {
            var val = result.values[i];
            console.log(val.id +": "+val.display_name+ " "+val.email+ " "+ val.phone);
          }*/
        });
  });
};

function initCiviCRM () {
  if (Object.keys(config).length > 0 ) {
    if (program.hasOwnProperty("site")) { 
      if (!config.hasOwnProperty(program.site)) { 
        console.log (error("civicrm site "+ program.site + " not configured."));
        console.log (warn("exisiting configurations "+ Object.keys(config).join(",")+" in "+ configFile.path+configFile.name));
        console.log (notice("to create a new config $civicrm setup -s "+ program.site));
        process.exit(1);

      }
      var c= config[program.site];
//      console.log (notice("using "+ program.site + " ("+c.server+")"));
      crmAPI = require('civicrm')(c);
    }
  } 
}


