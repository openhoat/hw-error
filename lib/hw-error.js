'use strict';

var _ = require('lodash')
  , log = require('hw-logger').log
  , that;

that = {
  httpErrors: {
    'BAD_FORMAT': {statusCode: 400, msg: 'bad request format'},
    'AUTHORIZATION': {statusCode: 401, msg: 'authorization required'},
    'FORBIDDEN': {statusCode: 403, msg: 'access forbidden'},
    'NOT_FOUND': {statusCode: 404, msg: 'resource not found'},
    'CONFLICT': {statusCode: 409, msg: 'resource conflict'},
    'INTERNAL': {statusCode: 500, msg: 'internal error'}
  },
  build: function (name, message) {
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
    return error;
  },
  removeLastInStack: function (stack) {
    stack = stack.split('\n');
    stack.splice(1, 1);
    return stack.join('\n');
  },
  send: function (res, error) {
    var data;
    if (typeof error === 'string' || typeof error === 'undefined') {
      error = that.build(error);
    }
    if (error.message) {
      data = {message: error.message};
    } else if (error.schemaErrors) {
      data = error.schemaErrors;
    } else {
      if (error && error.body) {
        data = error.body;
      } else if (that.httpErrors[error.name]) {
        data = {message: that.httpErrors[error.name].msg};
      } else {
        data = {message: 'internal error'};
      }
    }
    if (logger.enabledLevels.debug) {
      log.debug('%ssending error :', res.headersSent ? 'NOT ' : '', error);
      log.debug('error stack :', error instanceof Error ? that.removeLastInStack(error.stack) : error);
    }
    if (!res.headersSent) {
      res.status(error.statusCode || (that.httpErrors[error.name] && that.httpErrors[error.name].statusCode) || 500).json(data);
    }
  },
  throw: function (name, message) {
    var error = that.build(name, message);
    error.stack = that.removeLastInStack(error.stack);
    throw error;
  },
  throwNotFound: function (message) {
    var error = that.build('NOT_FOUND', message);
    error.stack = that.removeLastInStack(error.stack);
    throw error;
  }
};

exports = module.exports = that;