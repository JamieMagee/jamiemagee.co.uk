---
title: Your Jest tests might be wrong
date: '2023-05-04'
comments: true
---

Is your Jest test suite failing you? You might not be using the testing framework's full potential, especially when it comes to preventing state leakage between tests. The Jest settings [`clearMocks`](https://jestjs.io/docs/configuration#clearmocks-boolean), [`resetMocks`](https://jestjs.io/docs/configuration#resetmocks-boolean), [`restoreMocks`](https://jestjs.io/docs/configuration#restoremocks-boolean), and [`resetModules`](https://jestjs.io/docs/configuration#resetmodules-boolean) are set to `false` by default. If you haven’t changed these defaults, your tests might be fragile, order-dependent, or just downright wrong. In this blog post, I’ll dig into what each setting does, and how you can fix your tests.

## `clearMocks`

First up is `clearMocks`:

> Automatically clear mock calls, instances, contexts and results before every test. Equivalent to calling [`jest.clearAllMocks()`](https://jestjs.io/docs/jest-object#jestclearallmocks) before each test. This does not remove any mock implementation that may have been provided.
> 

Every Jest mock has some context associated with it. It’s how you’re able to call functions like `mockReturnValueOnce` instead of only `mockReturnValue`. But if `clearMocks` is false by default, then that context can be carried between tests.

Take this example function:

```ts
export function randomNumber() {
  return Math.random();
}
```

And this simple test for it:

```ts
jest.mock('.');

const { randomNumber } = require('.');

describe('tests', () => {
    randomNumber.mockReturnValue(42);
  
    it('should return 42', () => {
        const random = randomNumber();
    
        expect(random).toBe(42);
        expect(randomNumber).toBeCalledTimes(1)
    });
});
```

The test passes and works as expected. However, if we add another test to our test suite:

```ts
jest.mock('.');

const { randomNumber } = require('.');

describe('tests', () => {
    randomNumber.mockReturnValue(42);
  
    it('should return 42', () => {
        const random = randomNumber();
    
        expect(random).toBe(42);
        expect(randomNumber).toBeCalledTimes(1)
    });
    
    it('should return same number', () => {
        const random1 = randomNumber();
        const random2 = randomNumber();
    
        expect(random1).toBe(42);
        expect(random2).toBe(42);
    
        expect(randomNumber).toBeCalledTimes(2)
    });
});
```

Our second test fails with the error:

```bash
Error: expect(jest.fn()).toBeCalledTimes(expected)

Expected number of calls: 2
Received number of calls: 3
```

And even worse, if we change the order of our tests:

```ts
jest.mock('.');

const { randomNumber } = require('.');

describe('tests', () => {
    randomNumber.mockReturnValue(42);
  
    it('should return same number', () => {
        const random1 = randomNumber();
        const random2 = randomNumber();
    
        expect(random1).toBe(42);
        expect(random2).toBe(42);
    
        expect(randomNumber).toBeCalledTimes(2)
    });
  
    it('should return 42', () => {
        const random = randomNumber();
    
        expect(random).toBe(42);
        expect(randomNumber).toBeCalledTimes(1)
    });
});
```

We get the same error as before, but this time for `should return 42` instead of `should return same number`.

Enabling `clearMocks` in your Jest configuration ensures that every mock’s context is reset between tests. You can achieve the same result by adding `jest.clearAllMocks()` to your `beforeEach()` functions. But this isn’t a great idea as it means you have to remember to add it to each test file to make your tests safe, instead of using `clearMocks` to make them all safe by default.

## `resetMocks`

Next up is `resetMocks`:

> Automatically reset mock state before every test. Equivalent to calling [`jest.resetAllMocks()`](https://jestjs.io/docs/jest-object#jestresetallmocks) before each test. This will lead to any mocks having their fake implementations removed but does not restore their initial implementation.
> 

`resetMocks` takes `clearMocks` a step further, by clearing the implementation of any mocks. However, you need to use it in addition to `clearMocks`.

Going back to my first example again, I’m going to move the mock setup inside the first test case `randomNumber.mockReturnValue(42);`.

```ts
describe('tests', () => {
    it('should return 42', () => {
        randomNumber.mockReturnValue(42);
        const random = randomNumber();

        expect(random).toBe(42);
        expect(randomNumber).toBeCalledTimes(1)
    });

    it('should return 42 twice', () => {
        const random1 = randomNumber();
        const random2 = randomNumber();

        expect(random1).toBe(42);
        expect(random2).toBe(42);

        expect(randomNumber).toBeCalledTimes(2)
    });
});
```

Logically, you might expect this to fail, but it passes! Jest mocks are global to the file they’re in. It doesn’t matter what `describe`, `it`, or `test` scope you use. And if I change the order of tests again, they fail. This makes it very easy to write tests that leak state and are order-dependent.

Enabling `resetMocks` in your Jest context ensures that every mock implementation is reset between tests. Like before, you can also add `jest.resetAllMocks()` to `beforeEach()` in every test file. But it’s a much better idea to make your tests safe by default instead of having to opt-in to safe tests.

## **`restoreMocks`**

Next is `restoreMocks`:

> Automatically restore mock state and implementation before every test. Equivalent to calling [`jest.restoreAllMocks()`](https://jestjs.io/docs/jest-object#jestrestoreallmocks) before each test. This will lead to any mocks having their fake implementations removed and restores their initial implementation.
> 

`restoreMocks` takes test isolation and safety to the next level.

Let me rewrite my example a little bit, so instead of mocking the function directly, I’m mocking `Math.random()` instead.

```ts
const { randomNumber } = require('.');

const spy = jest.spyOn(Math, 'random');

describe('tests', () => {
    it('should return 42', () => {
        spy.mockReturnValue(42);
        const random = randomNumber();

        expect(random).toBe(42);
        expect(spy).toBeCalledTimes(1)
    });

    it('should return 42 twice', () => {
        spy.mockReturnValue(42);

        const random1 = randomNumber();
        const random2 = randomNumber();

        expect(random1).toBe(42);
        expect(random2).toBe(42);

        expect(spy).toBeCalledTimes(2)
    });
});
```

With `clearMocks` and `resetMocks` enabled, and `restoreMocks` disabled, my tests pass. But if I enable `restoreMocks` both tests fail with an error message like:

```bash
Error: expect(received).toBe(expected) // Object.is equality

Expected: 42
Received: 0.503533695686772
```

`restoreMocks` has restored the original implementation of `Math.random()` before each test, so now I’m getting an actual random number instead of my mocked return value of `42`. This forces me to be explicit about not only the mocked return values I’m expecting, but the mocks themselves.

To fix my tests I can set up my Jest mocks in each individual test.

```ts
describe('tests', () => {
    it('should return 42', () => {
        const spy = jest.spyOn(Math, 'random').mockReturnValue(42);
        const random = randomNumber();

        expect(random).toBe(42);
        expect(spy).toBeCalledTimes(1)
    });

    it('should return 42 twice', () => {
        const spy = jest.spyOn(Math, 'random').mockReturnValue(42);

        const random1 = randomNumber();
        const random2 = randomNumber();

        expect(random1).toBe(42);
        expect(random2).toBe(42);

        expect(spy).toBeCalledTimes(2)
    });
});
```

## `resetModules`

Finally, we have `resetModules`:

> By default, each test file gets its own independent module registry. Enabling `resetModules` goes a step further and resets the module registry before running each individual test. This is useful to isolate modules for every test so that the local module state doesn't conflict between tests. This can be done programmatically using [`jest.resetModules()`](https://jestjs.io/docs/jest-object#jestresetmodules).
> 

Again, this builds on top of `clearMocks`, `resetMocks`, and `restoreMocks`. I don’t think this level of isolation is required for most tests, but I’m a completionist.

Let’s take my example from above and expand it to include some initialization that needs to happen before I can call `randomNumber`. Maybe I need to make sure there’s enough entropy to generate random numbers? My module might look something like this:

```ts
let isInitialized = false;

export function initialize() {
    isInitialized = true;
}

export function randomNumber() {
    if (!isInitialized) {
        throw new Error();
    }

    return Math.random();
}
```

I also want to write some tests to make sure that this works as expected:

```ts
const random = require('.');

describe('tests', () => {
    it('does not throw when initialized', () => {
        expect(() => random.initialize()).not.toThrow();
    });

    it('throws when not initialized', () => {
        expect(() => random.randomNumber()).toThrow();
    });
});
```

`initialize` shouldn’t throw an error, but `randomNumber` should throw an error if `initialize` isn’t called first. Great! Except it doesn’t work. Instead I get:

```bash
Error: expect(received).toThrow()

Received function did not throw
```

That’s because without enabling `resetModules`, the module is shared between all tests in the file. So when I called `random.initialize()` in my first test, `isInitialized` is still true for my second test. But once again, if I were to switch the order of my tests in the file, they would both pass. So my tests are order-dependent again!

Enabling `resetModules` will give each test in the file a fresh version of the module for each test. Though, this might actually be a case where you want to use `jest.resetAllModules()` in your `beforeEach()` instead of enabling it globally. This kind of isolation isn’t required for every test. And if you’re using `import` instead of `require`, the syntax can get very awkward very quickly if you’re trying to avoid an `'import' and 'export' may only appear at the top level` error.

## TL;DR reset all of the things

By default, Jest tests are only isolated at the file level. If you really want to make sure your tests are safe and isolated, add this to your Jest config:

```js
{
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  resetModules: true // It depends
}
```

There is [a suggestion](https://github.com/facebook/jest/issues/10242) to make this part of the default configuration. But until then, you’ll have to do it yourself.