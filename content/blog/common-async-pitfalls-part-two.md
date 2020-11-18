---
title: Common async pitfalls—part two
date: '2020-11-18'
comments: true
draft: true
---

Following on from [part one]({{< ref "/blog/common-async-pitfalls-part-one" >}}), here's some more of the most common pitfalls I've come across—either myself, colleagues and friends, or examples in documentation—and how to avoid them.

## 'Fake'-sync is not async

If the method you are calling is synchronous, even in an async method, then call it like any other synchronous method. If you want to yield the thread, then you should use `Task.Yield` in most cases. For UI programming, see [this note](https://docs.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.yield) about `Task.Yield` from the .NET API documentation.

{{< gist JamieMagee cd3f7a69c86832d407a231d2d674dcfd "FakeSync.cs" >}}

## Delegates

Here's a common pitfall when passing actions as method parameters:

{{< gist JamieMagee cd3f7a69c86832d407a231d2d674dcfd "Delegates.cs" >}}

The implicit type conversion from the async function to `Action` is, surprisingly, not a compiler error! This happens because the function doesn't have a return value, so it's converted to a method with an `async void` signature. In this example the side effects aren't bad, but in a real application this could be terrible as it violates the expected execution contract.

## Synchronization

Synchronizing asynchronous code is slightly more complicated than synchronizing synchronous code. Mostly, this is because awaiting a task will result in switching to a different thread. This means that the standard synchronization primitives, which require the same thread to acquire and release a lock, won't work when used in an async state machine.

Therefore, you must take care to use thread safe synchronization primitives in async methods. For example, using `lock`, will block the current thread while your code waits to gain exclusive access. In asynchronous code, threads should only block for a short amount of time.

In general, it's not a good idea to perform any I/O under a lock. There's usually a much better way to synchronize access in asynchronous programming.

{{< gist JamieMagee cd3f7a69c86832d407a231d2d674dcfd "Synchronization.cs" >}}

### Lazy Initialization

Imagine you need to lazy initialize some object under a lock.

{{< gist JamieMagee cd3f7a69c86832d407a231d2d674dcfd "LazyInitialization1.cs" >}}

When converting `RetrieveData` to run asynchronously, you might try to rewrite `Initialize` a few different ways:

{{< gist JamieMagee cd3f7a69c86832d407a231d2d674dcfd "LazyInitialization2.cs" >}}

But there are a few issues:

1. You shouldn't call external code under a lock. The caller has no idea what work the external code will do, or what assumptions it has made.
1. You shouldn't perform I/O under a lock. Code sections under a lock should execute as quickly as possible, to reduce contention with other threads. As soon as you perform I/O under a lock, avoiding contention isn't possible.

### SemaphoreSlim

If you absolutely must perform asynchronous work which limits the number of callers, .NET provides `SemaphoreSlim` which support asynchronous, non-blocking, waiting.

You still need to take care when converting from a synchronous locking construct. Semaphores, unlike monitor locks, aren't re-entrant.

{{< gist JamieMagee cd3f7a69c86832d407a231d2d674dcfd "SemaphoreSlim.cs" >}}

## IDisposable

`IDisposible` is used to finalize acquired resources. In some cases, you need to dispose of these resources asynchronously, to avoid blocking. Unfortunately, you can't do this inside `Dispose()`.

Thankfully, .NET Core 3.0 provides the new `IAsyncDisposible` interface, which allows you to handle asynchronous finalization like so:

{{< gist JamieMagee cd3f7a69c86832d407a231d2d674dcfd "IDisposable.cs" >}}


## IEnumerable and IEnumerator

Usually you would implement `IEnumerable` or `IEnumerator` so you can use syntactic sugar, like `foreach` and LINQ-to-Objects. Unfortunately, these are synchronous interfaces that can only be used on synchronous data sources. If your underlying data source is actually asynchronous, you shouldn't expose it using these interfaces, as it will lead to blocking.

With the release of .NET Core 3.0 we got the `IAsyncEnumerable` and `IAsyncEnumerator` interfaces, which allow you to enumerate asynchronous data sources:

{{< gist JamieMagee cd3f7a69c86832d407a231d2d674dcfd "IEnumerator.cs" >}}

## Prefer the compiler-generated state machine

There are some valid cases for using `Task.ContinueWith`, but it can introduce some subtle bugs if not used carefully. It's much easier to avoid it, and just use `async` and `await` instead.

{{< gist JamieMagee cd3f7a69c86832d407a231d2d674dcfd "CompilerStateMachine.cs" >}}

### TaskCompletionSource

`TaskCompletionSourc<T>` allows you to support manual completion in asynchronous code. In general, this class should not be used... but when you have to use it you should be aware of the following behaviour:

{{< gist JamieMagee cd3f7a69c86832d407a231d2d674dcfd "TaskCompletionSource.cs" >}}

