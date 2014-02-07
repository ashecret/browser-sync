var fs = require("fs");
var bs = require("../../lib/browser-sync");
var messages = require("../../lib/messages");
var fileWatcher = require("../../lib/file-watcher");
var events = require("events");
var browserSync = new bs();
var options = bs.options;
var Gaze = require("gaze").Gaze;
var assert = require("chai").assert;
var sinon = require("sinon");

var testFile1 = "test/fixtures/test.txt";
var testFile2 = "test/fixtures/test2.txt";

describe("File Watcher Module", function () {
    it("change callback should be a function", function () {
        assert.isFunction(fileWatcher.getChangeCallback());
    });
    it("watch callback should be a function", function () {
        assert.isFunction(fileWatcher.getWatchCallback());
    });
    describe("returning a watching instance", function () {
        it("should return a watcher instance", function () {
            var actual = fileWatcher.getWatcher();
            assert.instanceOf(actual, Gaze);
        });
        it("should accept an array of patterns (1)", function () {
            var watcher = fileWatcher.getWatcher([testFile1]);
            assert.equal(watcher._patterns.length, 1);
        });
        it("should accept an array of patterns (2)", function () {
            var watcher = fileWatcher.getWatcher([testFile1, testFile2]);
            assert.equal(watcher._patterns.length, 2);
        });
    });
});

describe("Watching files init", function () {

    var logSpy;
    var watchCallback;
    var files;
    var msgStub;
    var emitter;
    var socket = {
        emit: function () {
            return true;
        }
    };
    var spy, eventSpy;
    before(function () {
        emitter = new events.EventEmitter();
        logSpy = sinon.spy();
        spy = sinon.spy();
        watchCallback = sinon.spy(fileWatcher, "getWatchCallback");
        msgStub = sinon.stub(messages.files, "watching").returns("MESSAGE");
        eventSpy = sinon.spy(emitter, "emit");
    });

    beforeEach(function () {
        files = [testFile1, testFile2];
        fileWatcher.init(files, {}, emitter);
    });

    afterEach(function () {
        watchCallback.reset();
        logSpy.reset();
        msgStub.reset();
        eventSpy.reset();
    });

    after(function () {
        msgStub.restore();
        watchCallback.restore();
    });
    it("should call the watch callback when watching has started", function (done) {
        setTimeout(function () {
            sinon.assert.called(eventSpy);
            done();
        }, 300);
    });
    it("should call messages.files.watching with the patterns", function (done) {
        setTimeout(function () {
            sinon.assert.calledWithExactly(msgStub, files);
            done();
        }, 300);
    });
    it("should log when the patterns when watching has started", function (done) {
        setTimeout(function () {
            sinon.assert.calledWithExactly(eventSpy, "log", {msg: "MESSAGE", override: true});
            done();
        }, 300);
    });
});

describe("Watching files init (when none found)", function () {

    var logSpy;
    var watchCallback;
    var files;
    var msgStub;
    var socket = {}, emitter, eventSpy;
    before(function () {
        emitter = new events.EventEmitter();
        logSpy = sinon.spy();
        watchCallback = sinon.spy(fileWatcher, "getWatchCallback");
        msgStub = sinon.stub(messages.files, "watching").returns("MESSAGE");
        eventSpy = sinon.spy(emitter, "emit");
    });

    beforeEach(function () {
        files = ["*.rb"];
        fileWatcher.init(files, {}, emitter);
    });

    afterEach(function () {
        watchCallback.reset();
        logSpy.reset();
        msgStub.reset();
    });

    after(function () {
        msgStub.restore();
    });

    it("should call the watch callback when watching has started", function (done) {
        setTimeout(function () {
            sinon.assert.called(eventSpy);
            done();
        }, 300);
    });
    it("should call messages.files.watching with NO params", function (done) {
        setTimeout(function () {
            var actual = msgStub.getCall(0);
            assert.deepEqual(actual.args.length, 0);
            done();
        }, 300);
    });
    it("should log when the patterns when watching has started", function (done) {
        setTimeout(function () {
            sinon.assert.calledWithExactly(eventSpy, "log", {msg: "MESSAGE", override: true});
            done();
        }, 300);
    });
});

describe("Watching files", function () {

    var callback;
    var changeCallback;
    var changedFile;
    var fsStub;
    var options, emitter, emitSpy;
    before(function () {
        emitter = new events.EventEmitter();
        options = {
            fileTimeout: 10
        };
        changedFile = testFile1;
        callback = sinon.spy();
        changeCallback = sinon.spy(fileWatcher.getChangeCallback(options, emitter));
        fsStub = sinon.stub(fs, "statSync");
        emitSpy = sinon.spy(emitter, "emit");
    });

    afterEach(function () {
        callback.reset();
        emitSpy.reset();
        changeCallback.reset();
        fsStub.reset();
    });

    after(function () {
        fsStub.restore();
    });

    it("can call the callback when a file has changed! with > 0 bytes", function (done) {

        fsStub.returns({size: 300});

        setTimeout(function () {
            changeCallback(changedFile);
        }, 20);

        setTimeout(function () {
            sinon.assert.calledWithExactly(emitSpy, "file:changed", {path: changedFile});
            done();
        }, 30);

    });
    it("does not call the callback if 0 bytes", function (done) {

        fsStub.returns({size: 0});

        setTimeout(function () {
            changeCallback(changedFile);
        }, 20);

        setTimeout(function () {
            sinon.assert.notCalled(emitSpy);
            done();
        }, 30);
    });
    it("should call the callback if 0 bytes first, then > 0 bytes on second call", function (done) {

        fsStub.returns({size: 0});

        setTimeout(function () {

            changeCallback(changedFile);

            fsStub.returns({size: 300});

            setTimeout(function () {

                changeCallback(changedFile);

                setTimeout(function () {
                    sinon.assert.calledWithExactly(emitSpy, "file:changed", {path: changedFile});
                    done();
                }, 20);
            }, 20);
        }, 20);
    });
});