# (-\_-)ゞ゛ Omnesiac

[![npm version](https://badge.fury.io/js/omnesiac.svg)](https://badge.fury.io/js/omnesiac)
[![Build Status](https://travis-ci.org/growombud/omnesiac.svg?branch=master)](https://travis-ci.org/growombud/omnesiac)

## Overview

A library implementing the marriage of two abstractions:

- Mutual Exclusion
- Memoization w/Time-to-Live

Concretely, this library was built to service two use-cases:

- I need to perform some asynchronous work, **throttled per unique key**, and all subsequent calls using that key will _block and await the result of that asynchronous work_.
- I need to perform some asynchronous work, **throttled per unique key**, and all subsequent calls using that key will _continue without knowing the result of that asynchronous work_.

tldr; a data-specific throttling mechanism in blocking and non-blocking flavors.

## Installation

Tested with >= Node.js 8.x

`yarn add omnesiac`

## Usage

```javascript
const Omnesiac = require('omnesiac');

async function doPeriodicAsynchronousWork(arg1, arg2) {
  /* 
    ...Do the deed...
  */
}

/*
 Memoize the results of this function for 30 seconds, and block subsequent calls while the asynchronous work is in-flight
*/
const throttledFn = Omnesiac(doPeriodicAsynchronousWork, { ttl: 30000, blocking: true });

const param1 = 'firstArgToTargetFunction';
const param2 = 'secondArgToTargetFunction';
const throttleKey = 'anyStringPerhapsAUserId';

/*
  The first call will execute the function. Subsequent calls using the same throttleKey will wait
  for the first call to finish and then resolve with the result of the first call for the next 30 seconds,
  whereupon, the next call will resume blocking until it has resolved, and on...
*/
const results = await throttledFn(throttleKey, param1, param2);
```

## TODO

- Better Documentation
  - Behavior
    - `{ ttl: 0 }`
    - Resolution order of blocked calls not guaranteed
  - Real-world Use Cases
- Timeouts on resolution of function calls?
  - Probably makes sense in the blocking scenario
- Many more tests
  - Ensure proper scoping / garbage-collection aspects
- Implement CodeCov.io or similar
  - Probably Istanbul
- Write proper Typescript generics
  - Eliminate `any` types
  - Set `strict: true` in tsconfig.json

## Contributing

1. Fork repo
2. Add / modify tests
3. Add / modify implementation\*
4. Open PR

\* (Optional, but strongly encouraged) Link to your development soundtrack in `README.md`

# License

MIT License

Copyright (c) 2020 Ombud

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Soundtrack

[![Francis Lai (Love Story Soundtrack) - Bozo Barrett](https://i.ytimg.com/vi/-j-KoAUln9U/hqdefault.jpg)](https://www.youtube.com/watch?v=-j-KoAUln9U)
