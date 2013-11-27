// use a minimal 100 line test framework. We do not want this
// file to exit prematurely. both `tape` & `mocha` do process.exit()
var test = require('assert-tap').test
var Readable = require('readable-stream').Readable
var getRawBody = require('../')

// this test is about infinite streams. If this file never terminates
// then its a bug because rawBody with limit's set should not 
// allow a process to hang.
// if any of the streams we create are left in flowing mode
// then the script never ends & its a failing test.

function createChunk() {
  var base = Math.random().toString(32)
  var KB_4 = 32 * 4
  var KB_8 = KB_4 * 2
  var KB_16 = KB_8 * 2
  var KB_64 = KB_16 * 4

  var rand = Math.random()
  if (rand < 0.25) {
    return repeat(base, KB_4)
  } else if (rand < 0.5) {
    return repeat(base, KB_8)
  } else if (rand < 0.75) {
    return repeat(base, KB_16)
  } else {
    return repeat(base, KB_64)
  }

  function repeat(str, num) {
    return new Array(num + 1).join(str)
  }
}

function createInfiniteStream() {
  var stream = new Readable()
  stream._read = function () {
    var rand = Math.floor(Math.random() * 10)

    process.nextTick(function () {
      for (var i = 0; i < rand; i++) {
        stream.push(createChunk())
      }
    })
  }

  // immediately put the stream in flowing mode
  stream.resume()

  return stream
}

var defaultLimit = 1024 * 1024

// assert is just the normal node assert & assert.end() is like done() in mocha
test('a stream with a limit lower then length', function (assert) {
  var stream = createInfiniteStream()

  getRawBody(stream, {
    limit: defaultLimit,
    length: defaultLimit * 2
  }, function (err, body) {
    assert.ok(err)
    assert.equal(err.type, 'entity.too.large')
    assert.equal(err.message, 'request entity too large')
    assert.equal(err.statusCode, 413)
    assert.equal(err.length, defaultLimit * 2)
    assert.equal(err.limit, defaultLimit)
    assert.equal(body, undefined)

    assert.end()
  })
})
