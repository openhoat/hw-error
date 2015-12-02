'use strict';

var _ = require('lodash')
  , logger = require('hw-logger')
  , log = logger.log
  , captureStackTrace, that;

if (Error.captureStackTrace) {
  captureStackTrace = Error.captureStackTrace;
} else {
  captureStackTrace = function captureStackTrace(error) {
    var container = new Error();
    Object.defineProperty(error, 'stack', {
      configurable: true,
      get: function getStack() {
        var stack = container.stack;
        Object.defineProperty(this, 'stack', {value: stack});
        return stack;
      }
    });
  };
}

function RootError(message, cause) {
  if (typeof message === 'object' && typeof message.toString === 'function') {
    this.toString = message.toString;
  }
  if (typeof message === 'object') {
    try {
      _.extend(this, message);
      message = JSON.stringify(message);
    } catch (err) {
    }
  }
  if (message) {
    Object.defineProperty(this, 'message', {
      configurable: true,
      value: message,
      writable: true
    });
  }
  if (cause) {
    Object.defineProperty(this, 'cause', {
      configurable: true,
      value: cause,
      writable: true
    });
  }
  Object.defineProperty(this, 'name', {
    configurable: true,
    value: this.constructor.name,
    writable: true
  });
  captureStackTrace(this, this.constructor);
}

RootError.prototype = Object.create(Error.prototype, {constructor: {value: RootError}});

RootError.prototype.toString = function () {
  var obj = Object(this)
    , name = this.name
    , msg = this.message;
  if (obj !== this) {
    throw new TypeError();
  }
  name = (typeof name === 'undefined') ? 'Error' : String(name);
  msg = (typeof msg === 'undefined') ? '' : String(msg);
  if (name === '') {
    return msg;
  }
  if (msg === '') {
    return name;
  }
  return name + ': ' + msg;
};

that = {
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
    Object.keys(httpErrors).forEach(function (errorCode) {
      var constructorName, constructor;
      constructorName = that.errorCodetoErrorClassName(errorCode);
      eval('constructor = function ' + constructorName + '(){RootError.apply(this,arguments);}');
      Object.defineProperty(that, constructorName, {
        configurable: true,
        enumerable: true,
        get: function () {
          return constructor;
        }
      });
    });
  },
  build: function (constructor, superClass) {
    var constructorName;
    superClass = !superClass || superClass === Error ? RootError : superClass;
    if (typeof constructor === 'string' || typeof constructor === 'undefined') {
      constructorName = that.errorCodetoErrorClassName(constructor);
    } else if (typeof constructor === 'object' && !(constructor instanceof Error)) {
      constructorName = that.errorCodetoErrorClassName(constructor.name || constructor.code);
    } else {
      constructorName = that.errorCodetoErrorClassName();
    }
    constructor = that[constructorName];
    constructor.super = superClass;
    constructor.superClass = constructor.super;
    constructor.prototype = Object.create(superClass.prototype, {
      constructor: {value: constructor}
    });
    return constructor;
  },
  removeLastInStack: function (stack) {
    stack = stack.split('\n');
    stack.splice(1, 1);
    return stack.join('\n');
  },
  send: function (res, error, req, reqParams) {
    var Error, errorCode, httpError, data;
    if (typeof error === 'undefined' || !(error instanceof RootError)) {
      (function (Error) {
        error = new Error(typeof error === 'object' && (error.message || error));
      })(that.build(error));
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
      if (typeof error === 'function' && error instanceof Error) {
        log.debug('error stack :', error.stack);
      }
    }
    if (!res.headersSent) {
      res.status(error.statusCode || (httpError && httpError.statusCode) || 500).json(data);
    }
  },
  throw: function (name, message, cause) {
    var Error = that.build(name)
      , error = new Error(message, cause);
    error.stack = that.removeLastInStack(error.stack);
    throw error;
  },
  throwNotFound: function (message, cause) {
    var Error = that.build('NOT_FOUND')
      , error = new Error(message, cause);
    error.stack = that.removeLastInStack(error.stack);
    throw error;
  }
};

that.init(that.httpErrors);

exports = module.exports = that;