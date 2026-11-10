const assert = require('node:assert/strict');
const {matchingSources} = require('../ui/sources.js');
const sources = [{url:'https://example.org/a'}, {url:'https://example.org/b'}];
assert.deepEqual(matchingSources('See [source](https://example.org/a).', sources), [sources[0]]);
assert.deepEqual(matchingSources('https://example.org/attacker', sources), []);
assert.deepEqual(matchingSources('No citation', sources), []);
assert.deepEqual(matchingSources('https://example.org/a, https://example.org/b.', sources), sources);
