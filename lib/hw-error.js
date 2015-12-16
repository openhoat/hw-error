'use strict';
/* jshint -W098: true */

var _ = require('lodash')
//, logger = require('hw-logger')
  , util = require('util')
//, log = logger.log
  , RootError, that;

function toErrorClassName(name) {
  var errorClassName;
  errorClassName = _.kebabCase(name);
  if (_.last(errorClassName.split('-')) !== 'error') {
    errorClassName = errorClassName + '-error';
  }
  errorClassName = _.capitalize(_.camelCase(errorClassName));
  return errorClassName;
}

function buildErrorType(name, opt) {
  var errorClassName, errorClass;

  function errorConstructor(message, extra) {
    /* jshint -W040: true */
    _.extend(this, _.omit(opt, 'parent'));
    this.name = this.constructor.name;
    if (typeof this.extra === 'undefined' && typeof message === 'object') {
      this.extra = message;
      this.message = JSON.stringify(this.extra);
    } else {
      this.message = message || this.message || '';
      this.extra = extra || this.extra;
    }
  }

  opt = _.extend({}, opt);
  errorClassName = toErrorClassName(name);
  _.defaults(opt, {code: _.snakeCase(errorClassName).toUpperCase()});
  /* jshint -W109: true */
  eval(
    util.format('errorClass = function %s() {' +
      "if (typeof this.stack === 'undefined') {" +
      'Error.captureStackTrace(this, this.constructor);' +
      '}' +
      'errorConstructor.apply(this, arguments);' +
      '}',
      errorClassName
    ));
  util.inherits(errorClass, opt.parent || RootError);
  return {name: errorClassName, fn: errorClass};
}

RootError = buildErrorType('RootError', {parent: Error}).fn;
RootError.prototype.toString = function () {
  if (typeof this.extra === 'object' && typeof this.extra.toString === 'function') {
    return this.extra.toString();
  }
  if (typeof this.message !== 'undefined') {
    return util.format('%s: %s', this.name, this.message);
  }
  return util.format('%s', this.name);
};

that = {
  RootError: RootError,
  init: function () {
    var http = require('http')
      , httpErrors;
    httpErrors = {
      badRequest: 400,
      unauthorized: 401,
      paymentRequired: 402,
      forbidden: 403,
      notFound: 404,
      methodNotAllowed: 405,
      notAcceptable: 406,
      proxyAuthenticationRequired: 407,
      requestTimeout: 408,
      conflict: 409,
      gone: 410,
      lengthRequired: 411,
      preconditionFailed: 412,
      requestEntityTooLarge: 413,
      requestUriTooLarge: 414,
      unsupportedMediaType: 415,
      requestedRangeNotSatisfiable: 416,
      expectationFailed: 417,
      imATeapot: 418,
      unprocessableEntity: 422,
      locked: 423,
      failedDependency: 424,
      unorderCollection: 407,
      upgradeRequired: 426,
      preconditionRequired: 428,
      tooManyRequests: 429,
      requestHeaderFieldsTooLarge: 431,
      internal: 500,
      notImplemented: 501,
      badGateway: 502,
      serviceUnavailable: 503,
      gatewayTimeout: 504,
      versionNotSupported: 505,
      variantAlsoNegotiates: 506,
      insufficientStorage: 507,
      bandwidthLimitExceeded: 509,
      notExtended: 510,
      networkAuthenticationRequired: 511
    };
    that.defaultErrors = that.defaultErrors || {};
    _.forIn(httpErrors, function (value, key) {
      var name = _.snakeCase('http_' + key).toUpperCase();
      that.defaultErrors[name] = {
        statusCode: value,
        message: http['STATUS_CODES']['' + value]
      };
    });
    _.forIn(that.defaultErrors, function (value, key) {
      that.build(key, value);
    });
  },
  build: function (name, opt) {
    opt = opt || {};
    var errorType, errorClass, throwFnName;
    errorType = buildErrorType(name, opt);
    errorClass = errorType.fn;
    if (opt.declare !== false) {
      that[errorType.name] = errorClass;
      throwFnName = util.format('throw%s', errorType.name.replace(/^(.*)Error$/, '$1'));
      that[throwFnName] = function () {
        var args = Array.prototype.slice.call(arguments)
          , error;
        /* jshint -W058: true */
        args.splice(0, 0, null);
        error = new (Function.bind.apply(errorClass, args));
        error.stack = that.removeLastInStack(error.stack);
        throw error;
      };
    }
    return errorClass;
  },
  removeLastInStack: function (stack) {
    stack = stack.split('\n');
    stack.splice(1, 1);
    return stack.join('\n');
  },
  throw: function (name) {
    var args = Array.prototype.slice.call(arguments)
      , errorClassName, errorClass, error;
    errorClassName = toErrorClassName(name || 'root');
    errorClass = that[errorClassName] || RootError;
    /* jshint -W058: true */
    args[0] = null;
    error = new (Function.bind.apply(errorClass, args));
    error.stack = that.removeLastInStack(error.stack);
    throw error;
  }
};

that.init();

exports = module.exports = that;