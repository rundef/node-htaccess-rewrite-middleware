'use strict';

function RewriteRule(base, source, dest, flags, conditions) {
  this.base = base;
  this.source = source;
  this.dest = dest;
  this.flags = flags.replace('[', '').replace(']', '').split(',').map(Function.prototype.call, String.prototype.trim);
  this.conditions = conditions;

  this.re = new RegExp(this.source);
}


RewriteRule.prototype.conditionsMatches = function (req) {
  for(var i = 0; i < this.conditions.length; i++) {
    if(this.conditions[i].matches(req) == false) {
      return false;
    }
  }

  return true;
};

RewriteRule.prototype.baseMatches = function (url) {
  if(url.indexOf(this.base) !== 0) {
    return null;
  }

  return url.substring(this.base.length);
};


RewriteRule.prototype.matches = function (url) {
  var result = this.re.exec(url);

  if(result == null) {
    return null;
  }

  var dest = this.dest;

  for(var i = 1; typeof result[i] != 'undefined'; i++) {
    var replaceRegexp = new RegExp('\\$' + i, 'g');

    dest = dest.replace(replaceRegexp, result[i]);
  }

  return {
    type: 'redirect',
    code: this.getRedirectStatusCode(),
    dest: dest
  };
};


RewriteRule.prototype.getRedirectStatusCode = function () {
  if(this.flags.indexOf('R=301') != -1) {
    return 301;
  }

  return 302;
};


module.exports = RewriteRule;