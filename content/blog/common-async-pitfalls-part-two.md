---
title: Common async pitfalls—part two
date: '2020-11-28'
comments: true
---

Following on from [part one]({{< ref "/blog/common-async-pitfalls-part-one" >}}), here's some more of the most common pitfalls I've come across—either myself, colleagues and friends, or examples in documentation—and how to avoid them.

## 'Fake'-sync is not async

If the method you are calling is synchronous, even in an async method, then call it like any other synchronous method. If you want to yield the thread, then you should use `Task.Yield` in most cases. For UI programming, see [this note](https://docs.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.yield) about `Task.Yield` from the .NET API documentation.

```cs
public async Task DoStuffAsync(CancellationToken cancellationToken)
{
    await SomeAsyncMethod(cancellationToken);

    // BAD: This provides no benefit and incurs the overhead of a thread hop
    await Task.Run(() =>
    {
        SomeSyncMethod();
        return Task.CompletedTask
    });

    // GOOD: Just keep the synchronous call on the current thread
    SomeSyncMethod();

    // GOOD: If you have a long-running loop, etc, then periodically yield for maximum thread sharing
    for (int i = 0; i < 1000; i++)
    {
        if (i % 100 == 0)
        {
            await Task.Yield();
        }

        // In some cases you will need to do CPU intensive work. This is ok but
        // care should be taken to yield at regular intervals
        AnExpensiveMethod();
    }
}
```
## Delegates

Here's a common pitfall when passing actions as method parameters:

```cs
// A standard method which accepts a callback. The expectation is that
// all methods execute sequentially
public void DoSomething(Action callback)
{
    First();

    try
    {
        callback();
    }
    catch (Exception ex)
    {
        Trace.WriteException(ex);
    }
    Second();
}

// GOOD: Invoked with an explicit action
DoSomething(() => Console.WriteLine("Hello"));

// BAD: This delegate is convertible to an async void method, which is allowed to be passed
// to a method which accepts an Action.
DoSomething(async () =>
{
    await Task.Delay(5000);
    // UH-OH! This exception will not be observed by the catch handler in DoSomething above
    // since the caller is not aware that this method is asynchronous
    throw new Exception("This will not be observed");
});
```

The implicit type conversion from the async function to `Action` is, surprisingly, not a compiler error! This happens because the function doesn't have a return value, so it's converted to a method with an `async void` signature. In this example the side effects aren't bad, but in a real application this could be terrible as it violates the expected execution contract.

## Synchronization

Synchronizing asynchronous code is slightly more complicated than synchronizing synchronous code. Mostly, this is because awaiting a task will result in switching to a different thread. This means that the standard synchronization primitives, which require the same thread to acquire and release a lock, won't work when used in an async state machine.

Therefore, you must take care to use thread safe synchronization primitives in async methods. For example, using `lock`, will block the current thread while your code waits to gain exclusive access. In asynchronous code, threads should only block for a short amount of time.

In general, it's not a good idea to perform any I/O under a lock. There's usually a much better way to synchronize access in asynchronous programming.

```cs
private object _lock = new object();

// GOOD: Don't do anything expensive inside a lock
lock (_lock)
{
    _cache = new Cache();
}

// BAD: This is performing unnecessary I/O under a lock
lock (_lock)
{
    _cache = Cache.LoadFromDatabase();
}
```

### Lazy Initialization

Imagine you need to lazy initialize some object under a lock.

```cs
private object _lock = new object();
private bool _initialized = false;
private int _value;

// BAD: This method performs blocking I/O under a lock
public void Initialize()
{
    if (_initialized)
    {
        return _value;
    }

    lock (_lock)
    {
        if (!_initialized)
        {
            _value = RetrieveData();
            _initialized = true;
        }
    }

    return _value;
}
```

When converting `RetrieveData` to run asynchronously, you might try to rewrite `Initialize` a few different ways:

```
// BAD: Performs I/O and blocks under a lock
lock (_lock)
{
    if (!_initialized)
    {
        _value = RetrieveDataAsync().SyncResult();
        _initialized = true;
    }
}

// BAD: Fails at runtime since you cannot change threads under a lock
lock (_lock)
{
    if (!_initialized)
    {
        _value = await RetrieveDataAsync();
        _initialized = true;
    }
}
```

But there are a few issues:

1. You shouldn't call external code under a lock. The caller has no idea what work the external code will do, or what assumptions it has made.
1. You shouldn't perform I/O under a lock. Code sections under a lock should execute as quickly as possible, to reduce contention with other threads. As soon as you perform I/O under a lock, avoiding contention isn't possible.

### SemaphoreSlim

If you absolutely must perform asynchronous work which limits the number of callers, .NET provides `SemaphoreSlim` which support asynchronous, non-blocking, waiting.

You still need to take care when converting from a synchronous locking construct. Semaphores, unlike monitor locks, aren't re-entrant.

```
private readonly SemaphoreSlim m_gate = new SemaphoreSlim(1, 1);

public async Task DoThingAsync(CancellationToken cancellationToken)
{
    // Be careful, semaphores aren't re-entrant!
    bool acquired = false;
    try
    {
        acquired = m_gate.WaitAsync(cancellationToken);
        if (acquired)
        {
            // Now that we have entered our mutex it is safe to work on shared data structures
            await DoMyCriticalWorkAsync(cancellationToken);
        }
    }
    finally
    {
        if (acquired)
        {
            m_gate.Release();
        }
    }
}
```

## IDisposable

`IDisposible` is used to finalize acquired resources. In some cases, you need to dispose of these resources asynchronously, to avoid blocking. Unfortunately, you can't do this inside `Dispose()`.

Thankfully, .NET Core 3.0 provides the new `IAsyncDisposible` interface, which allows you to handle asynchronous finalization like so:

```cs
class Foo : IAsyncDisposable
{
    public async Task DisposeAsync()
    {
        await SomethingAsync();
    }
}

await using (var foo = new Foo())
{
    return await foo.DoSomethingAsync();
}
```

## IEnumerable and IEnumerator

Usually you would implement `IEnumerable` or `IEnumerator` so you can use syntactic sugar, like `foreach` and LINQ-to-Objects. Unfortunately, these are synchronous interfaces that can only be used on synchronous data sources. If your underlying data source is actually asynchronous, you shouldn't expose it using these interfaces, as it will lead to blocking.

With the release of .NET Core 3.0 we got the `IAsyncEnumerable` and `IAsyncEnumerator` interfaces, which allow you to enumerate asynchronous data sources:

```
await foreach (var foo in fooCollection)
{
    await foo.DoSomethingAsync();
}
```

## Prefer the compiler-generated state machine

There are some valid cases for using `Task.ContinueWith`, but it can introduce some subtle bugs if not used carefully. It's much easier to avoid it, and just use `async` and `await` instead.

```
// BAD: This is using promise-based constructs
public Task DoThingAsync()
{
    return DoMoreThingsAsync().ContinueWith((t) => DoSomethingElse());
}

// BAD: A much worse version of the above
public Task<int> DoThingAsync()
{
    var tcs = new TaskCompletionSource<int>();
    DoMoreThingsAsync().ContinueWith(t =>
    {
        var result = t.Result;

        // UH-OH! The call to .Result is valid, however, it doesn't properly handle exceptions
        // which can lead to an async call chain which never completes. This is an very difficult
        // issue to debug as all evidence is garbage collected.
        tcs.SetResult(result);
    }

    return tcs.Task;
}

// GOOD: This is using await
public async Task DoThingAsync()
{
     await DoMoreThingsAsync();
     DoAnotherThing();
}
```

### TaskCompletionSource

`TaskCompletionSourc<T>` allows you to support manual completion in asynchronous code. In general, this class should not be used... but when you have to use it you should be aware of the following behaviour:

```cs
var waiters = new List<TaskCompletionSource<int>>();

// BAD: This uses default continuation options which result in synchronous callbacks
Task SomeMethod(CancellationToken cancellationToken)
{
    var tcs1 = new TaskCompletionSource<int>();
    waiters.Add(tcs1);
    return tcs1.Task;
}

// GOOD: This uses explicit asynchronous continuations
Task SomeMethod(CancellationToken cancellationToken)
{
    var tcs2 = new TaskCompletionSource<int>(TaskCreationOptions.RunContinuationsAsynchronously); 
    waiters.Add(tcs2);
    return tcs2.Task;
}

// The problem comes in when a caller awaits your task. The callee may have an expectation that the callbacks execute
// quickly, but in the example below this is only true for the implementation which specifies asynchronous continuation.
// The reason is the caller of TaskCompletionSource<T>.SetResult will be blocked for the entire duration of the loop 
// below when using the first implementation, while in the second implementation the loop will run on a different thread
// and the caller may continue execution quickly as expected.
async Task SomeCaller(CancellationToken cancellationToken)
{
    var foo = await SomeMethod();
    for (int i = 0; i < 10000; i++)
    {
        // Do something synchronous and expensive
    }
}
```
