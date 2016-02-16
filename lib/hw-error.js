'use strict';
/* jshint -W098: true */

var _ = require('lodash')
  , logger = require('hw-logger')
  , util = require('util')
  , log = logger.log
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
    this.name = this.constructor.name;
    if (typeof extra === 'undefined' && typeof message === 'object') {
      this.extra = message;
      this.message = this.message && this.message !== '' ? this.message : JSON.stringify(this.extra);
    } else {
      this.message = this.message && this.message !== '' ? this.message : message;
      this.extra = extra || this.extra;
    }
    _.defaults(this, _.omit(opt, ['parent', 'constructor', 'customize']));
    if (typeof opt.constructor === 'function') {
      logger.enabledLevels.debug && log.debug('invoking error custom constructor');
      opt.constructor.apply(this, arguments);
    }
    this.message = this.message || '';
  }

  if (typeof opt === 'undefined' && typeof name === 'object') {
    opt = name;
    name = opt.constructor.name;
  }
  opt = _.extend({}, opt);
  errorClassName = toErrorClassName(name);
  logger.enabledLevels.debug && log.debug('build error type %s with class %s', name, errorClassName);
  _.defaults(opt, {code: _.snakeCase(errorClassName).toUpperCase()});
  /* jshint -W109: true */
  eval(
    util.format(['errorClass = function %s() {',
        "  if (typeof this.stack === 'undefined') {",
        '    Error.captureStackTrace(this, this.constructor);',
        '  }',
        '  errorConstructor.apply(this, arguments);',
        '}'].join('\n'),
      errorClassName
    ));
  util.inherits(errorClass, opt.parent || RootError);
  if (typeof opt.customizeClass === 'function') {
    logger.enabledLevels.debug && log.debug('invoking error class customizer');
    opt.customizeClass.apply(errorClass, arguments);
  }
  return {name: errorClassName, fn: errorClass};
}

RootError = buildErrorType('RootError', {parent: Error}).fn;
RootError.prototype.toString = function () {
  if (typeof this.extra === 'object' && typeof this.extra.toString === 'function') {
    return this.extra.toString();
  }
  if (typeof this.message !== 'undefined' && this.message !== '') {
    return util.format('%s: %s', this.name, this.message);
  }
  return util.format('%s', this.name);
};

that = {
  RootError: RootError,
  clean: function () {
    logger.enabledLevels.debug && log.debug('cleaning declared error types');
    Object.keys(that).forEach(function (key) {
      var match = key.match(/^(?!RootError)[A-Z][\w]*Error$/) || key.match(/throw[A-Z][\w]*$/);
      if (match) {
        delete that[key];
        logger.enabledLevels.debug && log.debug('deleting error type :', key);
      }
    });
    logger.enabledLevels.debug && log.debug('remaining keys :', Object.keys(that));
  },
  getErrors: function () {
    return Object.keys(that).filter(function (key) {
      return key.match(/^[A-Z][\w]*Error$/);
    });
  },
  init: function () {
    logger.enabledLevels.debug && log.debug('init');
    that.clean();
  },
  initErrors: function (errors) {
    if (Array.isArray(errors)) {
      errors.forEach(function (error) {
        if (Array.isArray(error)) {
          if (error[1].parent) {
            error[1].parent = _.get(that, error[1].parent) || error[1].parent;
          }
          that.build.apply(null, error);
        } else {
          if (error.parent) {
            error.parent = _.get(that, error.parent) || error.parent;
          }
          that.build.call(null, error);
        }
      });
    } else {
      _.forIn(errors, function (error, name) {
        logger.enabledLevels.debug && log.debug('building error type :', name);
        if (error.parent) {
          error.parent = _.get(that, error.parent) || error.parent;
        }
        that.build(name, error);
      });
    }
  },
  build: function (name, opt) {
    opt = opt || {};
    var errorType, errorClass, throwFnName;
    errorType = buildErrorType.apply(null, arguments);
    errorClass = errorType.fn;
    if (opt.declare !== false) {
      Object.defineProperty(that, errorType.name, {
        configurable: true,
        enumerable: true,
        writable: false,
        value: errorClass
      });
      throwFnName = util.format('throw%s', errorType.name.replace(/^(.*)Error$/, '$1'));
      logger.enabledLevels.debug && log.debug('create throw helper :', throwFnName);
      that[throwFnName] = that.throw.bind(this, errorClass.name);
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
    logger.enabledLevels.debug && log.debug('throwing error %s', errorClassName);
    error = new (Function.bind.apply(errorClass, args));
    error.stack = that.removeLastInStack(error.stack);
    logger.enabledLevels.trace && log.trace('error stack :', error.stack);
    throw error;
  }
};

that.init();

exports = module.exports = that;