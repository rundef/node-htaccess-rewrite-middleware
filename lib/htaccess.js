'use strict';

var fs = require('fs');
var chalk = require('chalk');
var _ = require('lodash');
var RewriteRule = require('./RewriteRule');
var RewriteCond = require('./RewriteCond');
var url = require('url')

function HtaccessInterpreter(options) {
  this.verbose = options.verbose || false;

  if(typeof options.file == 'undefined') {
    throw new Error('Options.file not specified');
  }

  if(!fs.statSync(options.file).isFile()) {
    throw new Error('Options.file file does not exist');
  }

  this.filePath = options.file;
  this.content = fs.readFileSync(this.filePath);

  this.content = this.content.toString().split('\n').filter(function (line) {
    var trimmed = line.trim();

    return trimmed.length > 0 && trimmed.substring(0, 1) != '#';
  });

  this.rules = [];
  this.parseHtaccessContent();

  return this.middleware.bind(this);
}

HtaccessInterpreter.prototype.parseHtaccessContent = function () {
  var RewriteEngineActivated = false;
  var RewriteBase = '/';
  var conditions = [];

  for(var i = 0; i < this.content.length; i++) {
    var line = this.content[i].trim();
    var parts = line.trim().split(' ').filter(function (part) {
      return part.length > 0;
    });

    if(parts[0] == 'RewriteEngine') {
      RewriteEngineActivated = (parts[1].toLowerCase() == 'on');
    }
    else if(parts[0] == 'RewriteBase') {
      if(RewriteEngineActivated) {
        RewriteBase = parts[1];
      }
    }
    else if(parts[0] == 'RewriteCond') {
      if(RewriteEngineActivated) {
        var flag = typeof parts[3] == 'undefined' ? '' : parts[3];
        var condition = new RewriteCond(parts[1], parts[2], flag);
        conditions.push(condition);
      }
    }
    else if(parts[0] == 'RewriteRule') {
      if(RewriteEngineActivated) {
        var flag = typeof parts[3] == 'undefined' ? '' : parts[3];
        var rule = new RewriteRule(RewriteBase, parts[1], parts[2], flag, conditions);
        this.rules.push(rule);

        conditions = [];
      }
    }
    else if(this.verbose) {
      console.log(chalk.yellow.bgBlack(' WARN: rule not understood: '+line));
    }
  }
};

HtaccessInterpreter.prototype.middleware = function (req, res, next) {
  var parsedUrl = url.parse(req.url);
  var reqUrl = parsedUrl.pathname;

  for(var i = 0; i < this.rules.length; i++) {
    var reqUrlNoBase = this.rules[i].baseMatches(reqUrl);

    if(reqUrlNoBase && this.rules[i].conditionsMatches(req)) {
      var action = this.rules[i].matches(reqUrlNoBase);

      if(!action && reqUrlNoBase[0] == '/') {
        action = this.rules[i].matches(reqUrlNoBase.substring(1));
      }

      if(action) {
        if(action.type == 'redirect') {
          if(this.verbose) {
            console.log(chalk.green.bgBlack(' Redirecting ('+action.code+') '+reqUrl+' to '+action.dest));
          }

          if(parsedUrl.query) {
            action.dest += '?' + parsedUrl.query;
          }
          
          return res.redirect(action.code, action.dest);
        }
      }
    }
  }

  next();
};

module.exports = function (options) {
  return (new HtaccessInterpreter(options));
};