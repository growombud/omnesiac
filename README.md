# (-\_-)ゞ゛ Omnesiac

A library implementing the marriage of two abstractions:

- Mutual Exclusion
- Memoization w/Time-to-Live

Concretely, this library was built to service two use-cases:

- I need to execute some asynchronous work, **once-at-most**, within a given time-span, and all other subsequent requests within the time window must _wait for the result of that asynchronous work_.
- I need to execute some asynchronous work, **once-at-most**, within a given time-span, and all other subsequent requests within the time window must _continue without knowing the result of that asynchronous work_.

## Installation

_TODO: Publish to npm_

## Usage

_TODO: Documentation_

## TODO

- Document behavior
- Many more tests
  - Ensure proper scoping / garbage-collection aspects
- Write proper Typescript generics
  - Eliminate `any` types
  - Set `strict: true` in tsconfig.json
- Implement CI
  - Probably via Travis, if we're OSS'ing this package
    - explore pros / cons of doing it via internal Jenkins
  - Implement NPM publish
    - Possibly via release-it, a la ombud-permissions

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
