'use strict';

var _ = require('lodash')
  , logger = require('hw-logger')
  , log = logger.log
  , that;

that = {
  httpErrors: {
    'BAD_FORMAT': {statusCode: 400, msg: 'bad request format'},
    'AUTHORIZATION': {statusCode: 401, msg: 'authorization required'},
    'FORBIDDEN': {statusCode: 403, msg: 'access forbidden'},
    'NOT_FOUND': {statusCode: 404, msg: 'resource not found'},
    'CONFLICT': {statusCode: 409, msg: 'resource conflict'},
    'INTERNAL': {statusCode: 500, msg: 'internal error'},
    'SERVICE_UNAVAILABLE': {statusCode: 503, msg: 'service unavailable'}
  },
  build: function (name, message, cause) {
    var error;
    if (typeof message === 'string') {
      error = new Error(message);
    } else if (typeof message === 'object') {
      error = new Error(JSON.stringify(message));
      _.extend(error, message);
    } else {
      error = new Error();
    }
    error.name = name;
    error.stack = that.removeLastInStack(error.stack);
    if (cause) {
      error.cause = cause;
    }
    return error;
  },
  removeLastInStack: function (stack) {
    stack = stack.split('\n');
    stack.splice(1, 1);
    return stack.join('\n');
  },
  send: function (res, error, req, reqParams) {
    var data;
    if (typeof error === 'string' || typeof error === 'undefined') {
      error = that.build(error);
    }
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
    } else if (error.message) {
      data = {code: error.name || 'INTERNAL', message: error.message};
    } else {
      if (error && error.body) {
        data = error.body;
      } else if (that.httpErrors[error.name]) {
        data = {code: error.name || 'INTERNAL', message: that.httpErrors[error.name].msg};
      } else {
        data = {code: error.name || 'INTERNAL', message: 'internal error'};
      }
    }
    if (req && req.t && data.message) {
      data.message = req.t(data.message, _.extend({lng: req.lng}, reqParams));
    }
    if (logger.enabledLevels.debug) {
      log.debug('%ssending error :', res.headersSent ? 'NOT ' : '', error);
      if (error instanceof Error) {
        log.debug('error stack :', error.stack);
      }
    }
    if (!res.headersSent) {
      res.status(error.statusCode || (that.httpErrors[error.name] && that.httpErrors[error.name].statusCode) || 500).json(data);
    }
  },
  throw: function (name, message, cause) {
    var error = that.build(name, message, cause);
    error.stack = that.removeLastInStack(error.stack);
    throw error;
  },
  throwNotFound: function (message, cause) {
    var error = that.build('NOT_FOUND', message, cause);
    error.stack = that.removeLastInStack(error.stack);
    throw error;
  }
};

exports = module.exports = that;