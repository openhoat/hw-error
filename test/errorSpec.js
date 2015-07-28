'use strict';

var chai = require('chai')
  , expect = chai.expect
  , util = require('util')
  , hwError = require('../lib/hw-error')
  , logger = require('hw-logger')
  , log = logger.log;

describe('hw-error', function () {

  describe('build', function () {

    it('should build a simple error', function () {
      var error;
      error = hwError.build('INTERNAL');
      expect(error).to.be.an.instanceof(Error);
      expect(error).to.have.property('name', 'INTERNAL');
      expect(error).to.have.property('message', '');
      expect(error.toString()).to.equal('INTERNAL');
      expect(error.stack).to.match(/^INTERNAL\n[ ]+at Context.<anonymous> (.*\/errorSpec.js:.*)\n.*/);
    });

    it('should build an error with message', function () {
      var error;
      error = hwError.build('INTERNAL', 'test error');
      expect(error).to.be.an.instanceof(Error);
      expect(error).to.have.property('name', 'INTERNAL');
      expect(error).to.have.property('message', 'test error');
      expect(error.toString()).to.equal('INTERNAL: test error');
      expect(error.stack).to.match(/^INTERNAL: test error\n[ ]+at Context.<anonymous> (.*\/errorSpec.js:.*)\n.*/);
    });

    it('should build an error with object', function () {
      var o, error;
      o = {a: 4};
      o.toString = util.format.bind(null, '[a : %s]', o.a);
      error = hwError.build('INTERNAL', o);
      expect(error).to.be.an.instanceof(Error);
      expect(error).to.have.property('name', 'INTERNAL');
      expect(error).to.have.property('message', '{"a":4}');
      expect(error.toString()).to.equal('[a : 4]');
      expect(error).to.have.property('a', 4);
      expect(error.stack).to.match(/^INTERNAL: {"a":4}\n[ ]+at Context.<anonymous> (.*\/errorSpec.js:.*)\n.*/);
    });

  });

  describe('throw', function () {

    it('should throw a simple error', function () {
      try {
        hwError.throw('INTERNAL');
      } catch (error) {
        expect(error).to.be.an.instanceof(Error);
        expect(error).to.have.property('name', 'INTERNAL');
        expect(error).to.have.property('message', '');
        expect(error.toString()).to.equal('INTERNAL');
        expect(error.stack).to.match(/^INTERNAL\n[ ]+at Context.<anonymous> (.*\/errorSpec.js:.*)\n.*/);
      }
    });

    it('should throw an error with message', function () {
      try {
        hwError.throw('INTERNAL', 'test error');
      } catch (error) {
        expect(error).to.be.an.instanceof(Error);
        expect(error).to.have.property('name', 'INTERNAL');
        expect(error).to.have.property('message', 'test error');
        expect(error.toString()).to.equal('INTERNAL: test error');
        expect(error.stack).to.match(/INTERNAL: test error\n[ ]+at Context.<anonymous> (.*\/errorSpec.js:.*)\n.*/);
      }
    });

    it('should throw an error with object', function () {
      var o;
      o = {a: 4};
      o.toString = util.format.bind(null, '[a : %s]', o.a);
      try {
        hwError.throw('INTERNAL', o);
      } catch (error) {
        expect(error).to.be.an.instanceof(Error);
        expect(error).to.have.property('name', 'INTERNAL');
        expect(error).to.have.property('message', '{"a":4}');
        expect(error.toString()).to.equal('[a : 4]');
        expect(error).to.have.property('a', 4);
        expect(error.stack).to.match(/INTERNAL: {"a":4}\n[ ]+at Context.<anonymous> (.*\/errorSpec.js:.*)\n.*/);
      }
    });

    it('should throw a not found error', function () {
      try {
        hwError.throwNotFound();
      } catch (error) {
        expect(error).to.be.an.instanceof(Error);
        expect(error).to.have.property('name', 'NOT_FOUND');
        expect(error).to.have.property('message', '');
        expect(error.toString()).to.equal('NOT_FOUND');
        expect(error.stack).to.match(/NOT_FOUND\n[ ]+at Context.<anonymous> (.*\/errorSpec.js:.*)\n.*/);
      }
    });

  });

  describe('send', function () {

    var res = {
      status: function (statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      json: function (body) {
        this.body = body;
        return this;
      }
    };

    beforeEach(function () {
      res.statusCode = null;
      res.body = null;
    });

    describe('simple error', function () {

      it('should send a simple bad format error', function () {
        hwError.send(res, 'BAD_FORMAT');
        expect(res).to.have.property('statusCode', 400);
        expect(res).to.have.property('body').that.eql({message: 'bad request format'});
      });

      it('should send a simple authorization error', function () {
        hwError.send(res, 'AUTHORIZATION');
        expect(res).to.have.property('statusCode', 401);
        expect(res).to.have.property('body').that.eql({message: 'authorization required'});
      });

      it('should send a simple forbidden error', function () {
        hwError.send(res, 'FORBIDDEN');
        expect(res).to.have.property('statusCode', 403);
        expect(res).to.have.property('body').that.eql({message: 'access forbidden'});
      });

      it('should send a simple not found error', function () {
        hwError.send(res, 'NOT_FOUND');
        expect(res).to.have.property('statusCode', 404);
        expect(res).to.have.property('body').that.eql({message: 'resource not found'});
      });

      it('should send a simple conflict error', function () {
        hwError.send(res, 'CONFLICT');
        expect(res).to.have.property('statusCode', 409);
        expect(res).to.have.property('body').that.eql({message: 'resource conflict'});
      });

      it('should send a simple internal error', function () {
        hwError.send(res, 'INTERNAL');
        expect(res).to.have.property('statusCode', 500);
        expect(res).to.have.property('body').that.eql({message: 'internal error'});
      });

    });

    describe('message error', function () {

      it('should send a bad format error with message', function () {
        hwError.send(res, {name: 'BAD_FORMAT', message: 'field required'});
        expect(res).to.have.property('statusCode', 400);
        expect(res).to.have.property('body').that.eql({message: 'field required'});
      });

      it('should send a authorization error with message', function () {
        hwError.send(res, {name: 'AUTHORIZATION', message: 'authorization needed'});
        expect(res).to.have.property('statusCode', 401);
        expect(res).to.have.property('body').that.eql({message: 'authorization needed'});
      });

      it('should send a forbidden error with message', function () {
        hwError.send(res, {name: 'FORBIDDEN', message: 'you are not allowed'});
        expect(res).to.have.property('statusCode', 403);
        expect(res).to.have.property('body').that.eql({message: 'you are not allowed'});
      });

      it('should send a not found error with message', function () {
        hwError.send(res, {name: 'NOT_FOUND', message: 'page not found'});
        expect(res).to.have.property('statusCode', 404);
        expect(res).to.have.property('body').that.eql({message: 'page not found'});
      });

      it('should send a simple conflict error', function () {
        hwError.send(res, {name: 'CONFLICT', message: 'resource already exists'});
        expect(res).to.have.property('statusCode', 409);
        expect(res).to.have.property('body').that.eql({message: 'resource already exists'});
      });

      it('should send a simple internal error', function () {
        hwError.send(res, {name: 'INTERNAL', message: 'oops'});
        expect(res).to.have.property('statusCode', 500);
        expect(res).to.have.property('body').that.eql({message: 'oops'});
      });

    });

    it('should send an error with body', function () {
      hwError.send(res, {name: 'INTERNAL', body: {a: 4, b: 5}});
      expect(res).to.have.property('statusCode', 500);
      expect(res).to.have.property('body').that.eql({a: 4, b: 5});
    });

    it('should send an error with schema errors', function () {
      hwError.send(res, {name: 'INTERNAL', schemaErrors: [{a: 4}, {b: 5}]});
      expect(res).to.have.property('statusCode', 500);
      expect(res).to.have.property('body').that.eql([{a: 4}, {b: 5}]);
    });

    it('should send a simple error with logs', function () {
      var level = logger.getLevel();
      logger.setLevel('debug');
      hwError.send(res);
      logger.setLevel(level);
      expect(res).to.have.property('statusCode', 500);
      expect(res).to.have.property('body').that.eql({message: 'internal error'});
    });

  });

});