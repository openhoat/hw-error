'use strict';

var chai = require('chai')
  , expect = chai.expect
  , util = require('util')
  , hwError = require('../lib/hw-error');
//, logger = require('hw-logger')
//, log = logger.log;

describe('hw-error', function () {

  beforeEach(function () {
    hwError.init();
  });

  describe('build', function () {

    it('should provide root error', function () {
      var error, fn;
      error = new hwError.RootError();
      expect(error).to.be.an.instanceof(hwError.RootError);
      expect(error).to.be.an.instanceof(Error);
      expect(error).to.have.property('name', 'RootError');
      expect(error).to.have.property('code', 'ROOT_ERROR');
      expect(error).to.have.property('message', '');
      expect(error.toString()).to.equal('RootError');
      expect(error.stack).to.match(/^RootError\n[ ]+at Context.<anonymous> (.*\/errorSpec.js:.*)\n.*/);
      fn = function () {
        throw error;
      };
      expect(fn).to.throw(hwError.RootError);
      expect(fn).to.throw(Error);
      expect(fn).to.throw(error.name);
      expect(hwError).to.respondTo('throw');
    });

    it('should build a simple error', function () {
      var CustomError, error, fn;
      CustomError = hwError.build({
        constructor: function CustomError() {
          this.custom = true;
        },
        customizeClass: function () {
          this.customClass = true;
        },
        declare: false
      });
      expect(CustomError).to.have.property('customClass', true);
      error = new CustomError();
      expect(error).to.be.an.instanceof(CustomError);
      expect(error).to.be.an.instanceof(Error);
      expect(error).to.have.property('name', 'CustomError');
      expect(error).to.have.property('code', 'CUSTOM_ERROR');
      expect(error).to.have.property('message', '');
      expect(error).to.have.property('custom', true);
      expect(error.toString()).to.equal('CustomError');
      expect(error.stack).to.match(/^CustomError\n[ ]+at Context.<anonymous> (.*\/errorSpec.js:.*)\n.*/);
      fn = function () {
        throw error;
      };
      expect(fn).to.throw(CustomError);
      expect(fn).to.throw(Error);
      expect(fn).to.throw(error.name);
      expect(hwError).to.respondTo('throwCustom');
      expect(hwError.throwCustom).to.throw(CustomError);
    });

    it('should build a simple error declared', function () {
      var CustomError, error, fn;
      CustomError = hwError.build('custom');
      expect(hwError).to.have.property('CustomError', CustomError);
      error = new CustomError();
      expect(error).to.be.an.instanceof(CustomError);
      expect(error).to.be.an.instanceof(Error);
      expect(error).to.have.property('name', 'CustomError');
      expect(error).to.have.property('code', 'CUSTOM_ERROR');
      expect(error).to.have.property('message', '');
      expect(error.toString()).to.equal('CustomError');
      expect(error.stack).to.match(/^CustomError\n[ ]+at Context.<anonymous> (.*\/errorSpec.js:.*)\n.*/);
      fn = function () {
        throw error;
      };
      expect(fn).to.throw(CustomError);
      expect(fn).to.throw(Error);
      expect(fn).to.throw(error.name);
      expect(hwError).to.respondTo('throwCustom');
      expect(hwError.throwCustom).to.throw(CustomError);
    });

    it('should build an error with message', function () {
      var CustomError, error, fn;
      CustomError = hwError.build('custom');
      expect(hwError).to.have.property('CustomError', CustomError);
      error = new CustomError('test error');
      expect(error).to.be.an.instanceof(CustomError);
      expect(error).to.be.an.instanceof(Error);
      expect(error).to.have.property('name', 'CustomError');
      expect(error).to.have.property('code', 'CUSTOM_ERROR');
      expect(error).to.have.property('message', 'test error');
      expect(error.toString()).to.equal('CustomError: test error');
      expect(error.stack).to.match(/^CustomError: test error\n[ ]+at Context.<anonymous> (.*\/errorSpec.js:.*)\n.*/);
      fn = function () {
        throw error;
      };
      expect(fn).to.throw(CustomError);
      expect(fn).to.throw(Error);
      expect(fn).to.throw(error.name);
      expect(hwError).to.respondTo('throwCustom');
      expect(hwError.throwCustom).to.throw(CustomError);
    });

    it('should build an error with object', function () {
      var CustomError, o, error, fn;
      CustomError = hwError.build('custom');
      o = {a: 4};
      o.toString = util.format.bind(null, '[a : %s]', o.a);
      error = new CustomError(o);
      expect(error).to.be.an.instanceof(CustomError);
      expect(error).to.be.an.instanceof(Error);
      expect(error).to.have.property('name', 'CustomError');
      expect(error).to.have.property('code', 'CUSTOM_ERROR');
      expect(error).to.have.property('message', '{"a":4}');
      expect(error.toString()).to.equal('[a : 4]');
      expect(error.stack).to.match(/^CustomError: {"a":4}\n[ ]+at Context.<anonymous> (.*\/errorSpec.js:.*)\n.*/);
      fn = function () {
        throw error;
      };
      expect(fn).to.throw(CustomError);
      expect(fn).to.throw(Error);
      expect(fn).to.throw('[a : 4]');
    });

  });

  describe('throw', function () {

    it('should throw a simple error', function () {
      try {
        hwError.throw('ROOT');
      } catch (error) {
        expect(error).to.be.an.instanceof(Error);
        expect(error).to.have.property('name', 'RootError');
        expect(error).to.have.property('code', 'ROOT_ERROR');
        expect(error.toString()).to.equal('RootError');
        expect(error.stack).to.match(/^RootError\n[ ]+at Context.<anonymous> (.*\/errorSpec.js:.*)\n.*/);
      }
    });

    it('should throw an error with message', function () {
      try {
        hwError.throw('ROOT', 'test error');
      } catch (error) {
        expect(error).to.be.an.instanceof(Error);
        expect(error).to.have.property('name', 'RootError');
        expect(error).to.have.property('code', 'ROOT_ERROR');
        expect(error).to.have.property('message', 'test error');
        expect(error.toString()).to.equal('RootError: test error');
        expect(error.stack).to.match(/RootError: test error\n[ ]+at Context.<anonymous> (.*\/errorSpec.js:.*)\n.*/);
      }
    });

    it('should throw an error with object', function () {
      var o;
      o = {a: 4};
      o.toString = util.format.bind(null, '[a : %s]', o.a);
      try {
        hwError.throw('ROOT', o);
      } catch (error) {
        expect(error).to.be.an.instanceof(Error);
        expect(error).to.have.property('name', 'RootError');
        expect(error).to.have.property('code', 'ROOT_ERROR');
        expect(error).to.have.property('message', '{"a":4}');
        expect(error.toString()).to.equal('[a : 4]');
        expect(error).to.have.property('extra');
        expect(error.extra).to.have.property('a', 4);
        expect(error.stack).to.match(/RootError: {"a":4}\n[ ]+at Context.<anonymous> (.*\/errorSpec.js:.*)\n.*/);
      }
    });

    it('should return registered error names', function () {
      var errors;
      errors = hwError.getErrors();
      expect(errors).to.be.an('array').of.length(1);
      expect(errors).to.eql(['RootError']);
    });

    it('should init custom errors', function () {
      var errors;
      hwError.initErrors({
        custom: {
          constructor: function CustomError() {
            this.code = 'CUSTOM';
          },
          parent: 'RootError'
        }
      });
      hwError.initErrors([
        {
          constructor: function YacError() {
            this.code = 'YAC';
          },
          parent: 'RootError'
        }, [
          'another', {parent: 'RootError'}
        ]
      ]);
      errors = hwError.getErrors();
      expect(errors).to.be.an('array').of.length(4);
      expect(errors).to.include('CustomError');
      expect(errors).to.include('YacError');
      expect(errors).to.include('AnotherError');
    });

  });

});