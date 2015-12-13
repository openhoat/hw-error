'use strict';

var util = require('util')
  , _ = require('lodash')
  , logger = require('hw-logger')
  , log = logger.log
  , that;

function RootError(message, cause) {
  var that = this;
  if (typeof cause === 'object' && cause.stack) {
    that.stack = cause.stack;
  } else {
    Error.captureStackTrace(that, that.constructor);
  }
  that.name = that.name || 'InternalError';
  if (typeof message === 'object') {
    if (typeof message.toString === 'function') {
      that.toString = message.toString;
    }
    Object.keys(message).forEach(function (key) {
      if (typeof that[key] === 'undefined' && typeof message[key] !== 'function') {
        that[key] = message[key];
      }
    });
    message = JSON.stringify(message);
  }
  that.message = message || '';
  if (cause) {
    that.cause = cause;
  }
}

util.inherits(RootError, Error);

RootError.prototype.toString = function () {
  var obj = Object(this)
    , name = this.name
    , msg = this.message;
  if (obj !== this) {
    throw new TypeError();
  }
  name = typeof name === 'undefined' ? 'Error' : String(name);
  msg = typeof msg === 'undefined' ? '' : String(msg);
  if (name === '') {
    return msg;
  }
  if (msg === '') {
    return name;
  }
  return name + ': ' + msg;
};

that = {
  RootError: RootError,
  httpErrors: {
    'BAD_FORMAT': {statusCode: 400, msg: 'bad request format'},
    'AUTHORIZATION': {statusCode: 401, msg: 'authorization required'},
    'PAYENT_REQUIRED': {statusCode: 402, msg: 'payment required'},
    'FORBIDDEN': {statusCode: 403, msg: 'access forbidden'},
    'NOT_FOUND': {statusCode: 404, msg: 'resource not found'},
    'CONFLICT': {statusCode: 409, msg: 'resource conflict'},
    'INTERNAL': {statusCode: 500, msg: 'internal error'},
    'SERVICE_UNAVAILABLE': {statusCode: 503, msg: 'service unavailable'}
  },
  errorCodetoErrorClassName: function (errorCode) {
    if (!errorCode) {
      return 'InternalError';
    }
    return _.capitalize(_.camelCase(errorCode)) + 'Error';
  },
  errorClassNametoErrorCode: function (className) {
    var match;
    if (className) {
      match = className.match(/^((.*)Error|(!Error))$/);
    }
    if (!match) {
      return 'INTERNAL';
    }
    return _.snakeCase(match[2]).toUpperCase();
  },
  init: function (httpErrors) {
    that.httpErrors = httpErrors;
    Object.keys(that).forEach(function (key) {
      var match;
      if (typeof that[key] !== 'function') {
        return;
      }
      match = key.match(/^(throw(.+)+|(A-Z)(.+)Error)$/);
      if (match) {
        delete that[key];
      }
    });
    Object.keys(httpErrors).forEach(function (errorCode) {
      var constructorName, constructor, throwFnName;
      constructorName = that.errorCodetoErrorClassName(errorCode);
      eval('constructor = function ' + constructorName + '(){RootError.apply(this,arguments);}');
      util.inherits(constructor, RootError);
      Object.defineProperty(that, constructorName, {
        configurable: true,
        enumerable: true,
        get: function () {
          return constructor;
        }
      });
      throwFnName = 'throw' + constructorName.match(/^(.*)Error$/)[1];
      that[throwFnName] = function (message, cause) {
        var Error, error;
        Error = that.build(errorCode);
        error = new Error(message, cause);
        error.stack = that.removeLastInStack(error.stack);
        throw error;
      };
    });
  },
  build: function (data) {
    var errorClassName, errorConstructor;
    if (typeof data === 'string' || typeof data === 'undefined') {
      errorClassName = that.errorCodetoErrorClassName(data);
    } else if (typeof data === 'object' && !(data instanceof Error)) {
      errorClassName = that.errorCodetoErrorClassName(data.name || data.code);
    } else {
      errorClassName = that.errorCodetoErrorClassName();
    }
    errorConstructor = that[errorClassName];
    if (!errorConstructor) {
      errorClassName = 'InternalError';
      errorConstructor = that[errorClassName];
    }
    util.inherits(errorConstructor, RootError);
    errorConstructor.prototype.name = errorClassName;
    return errorConstructor;
  },
  removeLastInStack: function (stack) {
    stack = stack.split('\n');
    stack.splice(1, 1);
    return stack.join('\n');
  },
  send: function (res, error, req, reqParams) {
    var isNativeError, Error, errorCode, httpError, data;
    if (typeof error === 'undefined' || !(error instanceof RootError)) {
      Error = that.build(error);
      isNativeError = typeof error === 'object' && (error instanceof Error || error instanceof RangeError || error instanceof ReferenceError || error instanceof SyntaxError || error instanceof TypeError);
      error = isNativeError ? new Error(error.message, error) : new Error(typeof error === 'object' && (error.message || error));
    }
    errorCode = that.errorClassNametoErrorCode(typeof error === 'string' ? error : error.name);
    httpError = that.httpErrors[errorCode];
    if (error.schemaErrors) {
      data = error.schemaErrors;
      if (Array.isArray(data)) {
        data = data.map(function (item) {
          var result = _.omit(_.extend(item, {code: 'BAD_FORMAT'}), ['instanceContext', 'resolutionScope', 'kind', 'desc']);
          if (item.desc) {
            result.message = item.desc;
          }
          return result;
        });
      }
    } else if (error.body) {
      data = error.body;
    } else if (error.message) {
      data = {code: errorCode, message: error.message};
    } else if (httpError) {
      data = {code: errorCode, message: httpError.msg};
    } else {
      data = {code: errorCode, message: 'internal error'};
    }
    if (req && req.t && data.message) {
      data.message = req.t(data.message, _.extend({lng: req.lng}, reqParams));
    }
    if (logger.enabledLevels.debug) {
      log.debug('%ssending error :', res.headersSent ? 'NOT ' : '', error);
      if (typeof error.stack !== 'undefined') {
        log.debug('error stack :', error.stack);
      }
    }
    if (!res.headersSent) {
      res.status(error.statusCode || (httpError && httpError.statusCode) || 500).json(data);
    }
  },
  throw: function (name, message, cause) {
    var Error, error;
    Error = that.build(name);
    error = new Error(message, cause);
    error.stack = that.removeLastInStack(error.stack);
    throw error;
  }
};

that.init(that.httpErrors);

exports = module.exports = that;