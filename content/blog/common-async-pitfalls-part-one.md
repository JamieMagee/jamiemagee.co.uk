---
title: Common async pitfalls—part one
date: '2020-11-17'
comments: true
---

The .NET Framework provides a great programming model that enables high performance code using an easy to understand syntax. However, this can often give developers a false sense of security, and the language and runtime aren't without pitfalls. Ideally static analysers, like the [Microsoft.VisualStudio.Threading.Analyzers Roslyn analysers](https://www.nuget.org/packages/Microsoft.VisualStudio.Threading.Analyzers/), would catch all these issues at build time. While they do help catch a lot of mistakes, they can't catch everything, so it's important to understand the problems and how to avoid them.

Here's a collection of some of the most common pitfalls I've come across—either myself, colleagues and friends, or examples in documentation—and how to avoid them.

## Blocking calls

The main benefit of asynchronous programming is that the thread pool can be smaller than a synchronous application while performing the same amount of work. However, once a piece of code begins to block threads, the resulting thread pool starvation can be ugly.

```csharp
public async Task DoStuffAsync(CancellationToken cancellationToken)
{
    Task<bool> resultTask = StuffAsync(cancellationToken);

    // BAD: These may deadlock depending on thread pool capacity or the presence of a sync context
    resultTask.Wait();
    resultTask.Result;
    resultTask.GetAwaiter().GetResult();

    // BAD: This blocks the thread
    Thread.Sleep(5000);

    // GOOD: Always await
    await resultTask;

    // GOOD: This does not block and allows for maximum throughput
    await Task.Delay(5000, cancellationToken);
}
```

If I run a small test, which makes 5000 concurrent HTTP requests to a local server, there are dramatically different results depending on how many blocking calls are used.

% blocking shows the number of calls that use `Task.Result`, which blocks the thread. All other requests use `await`.

| % Blocking | Threads | Total Duration | Avg. Duration |
| ---------- | ------- | -------------- | ------------- |
| 0          | 24      | 00:00:11.961   | 0.0023923     |
| 5          | 268     | 00:02:16.574   | 0.0273148     |

The increased total duration when using blocking calls is due to the thread pool growth, which happens slowly. You can always tune the thread pool settings to achieve better performance, but it will never match the performance you can achieve with non-blocking calls.

### Streams

Like all other blocking calls, any methods from `System.IO.Stream` should use their async equivalents: `Read` to `ReadAsync`, `Write` to `WriteAsync`, `Flush` to `FlushAsync`, etc. Also, after writing to a stream, you should call the `FlushAsync` method before disposing the stream. If not, the `Dispose` method may perform some blocking calls.

## CancellationToken

You should always propagate cancellation tokens to the next caller in the chain. This is called a cooperative cancellation model. If not, you can end up with methods that run longer than expected, or even worse, never complete.

To indicate to the caller that cancellation is supported, the final parameter in the method signature should be a `CancellationToken` object.

```csharp
public async Task DoStuffAsync()
{
    // BAD: This method does not accept a cancellation token. Cooperative cancellation is extremely important.
    await StuffAsync();
}

public async Task DoStuffAsync(CancellationToken cancellationToken)
{
    var httpClient = new HttpClient();

    // BAD: The caller has provided a cancellation token for cooperative cancellation but it was not provided
    // downstream. Regardless of the token being signaled the http client will not return until the
    // operation completes.
    await httpClient.GetAsync("http://example.com");

    // GOOD: Always propagate the token to the next caller in the chain
    await httpClient.GetAsync("http://example.com", cancellationToken);
}
```

### Linked tokens

If you need to put a timeout on an inner method call, you can link one cancellation token to another. For example, you want to make a service-to-service call, and you want to enforce a timeout, while still respecting the external cancellation.

```cs
public async Task<int> DoThingAsync(CancellationToken cancellationToken)
{
    using (var cancelTokenSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken))
    {
        // The cancellation token source will now manage a timer which automatically notifies the parent
        // token.
        cancelTokenSource.CancelAfter(TimeSpan.FromSeconds(10));

        // By linking the token source we will now cooperatively cancel. We have also
		// provided a time based auto-cancellation signal which only applies to the 
		// the single method. This is how nested cancellation scopes may be used in circuit breakers.
        await GetAsync(cancelTokenSource.Token);
    }

    // Other calls within the method may not need this restricted timeout so the original
    // cancellation token is used instead.
    await DoOtherThingAsync(cancellationToken);
}
```

### Cancelling uncancellable operations

Sometimes you may find the need to call an API which does not accept a cancellation token, but your API receives a token and is expected to respect cancellation. In this case the typical pattern involves managing two tasks and effectively abandoning the un-cancellable operation after the token signals.

```csharp
public async Task<int> DoThingAsync(CancellationToken cancellationToken)
{
    var tcs = new TaskCompetionSource<int>();
    using (var registration = cancellationToken.Register(() => tcs.SetResult(0)))
    {
         var completedTask = await Task.WhenAny(tcs.Task, DoNonCancellableCallAsync());
         if (completedTask == tcs.Task)
         {
             // We have been cancelled, so take appropriate action here. At this point in time the non-cancellable call is
             // still running. Once it completes everything will be properly garbage collected
             throw new OperationCanceledException(cancellationToken);
         }

        return await completedTask;
    }
}
```

## Constructors

Occasionally, you may find yourself wanting to perform asynchronous work during initialization of a class instance. Unfortunately, there is no way to make constructors async.

```csharp
public class Foo
{
    public Foo(int a, int c)
    {
        _a = a;
        // DON'T DO THIS!
        _b = CallSomethingAsync().SyncResult();
        _c = c;
    }

    private readonly int _a;
    private readonly string _b;
    private readonly int _c;
}
```
There are a couple of different ways to solve this. Here's a pattern I like:

1. A public static creator method, which publicly replaces the constructor
2. A private async member method, which does the work the constructor used to do
3. A private constructor, so callers can't directly instantiate the class by mistake

So, if I apply the same pattern to the class above the class becomes:

```csharp
public class Foo
{
    public static async Task<Foo> CreateAsync(int a, int c)
    {
        Foo instance = new Foo(a, c);
        await instance.InitializeAsync();
        return instance;
    }

    private Foo(int a, int c)
    {
        // GOOD: readonly keyword is retained
        _a = a;
        _c = c;
    }

    private async Task InitializeAsync()
    {
        // GOOD: all async work is performed here
        // NOTE: make sure initialization order is correct when porting existing code
        _b = await CallSomethingAsync();
    }

    private readonly int _a;
    private readonly int _c;

    string _b;
}
```

And we can instantiate the class by calling `var foo = await Foo.CreateAsync(1, 2);`.

In cases where the class is part of an inheritance hierarchy, the constructor can be made protected and `InitializeAsync` can be made protected virtual, so it can be overridden and called from derived classes. Each derived class will need to have its own `CreateAsync` method.

## Parallelism

### Avoid premature optimization

It might be very tempting to try to perform parallel work by not immediately awaiting tasks. In some cases, you can make significant performance improvements. However, if not used with care you can end up in debugging hell involving socket or port exhaustion, or database connection pool saturation.

```csharp
public async Task DoTwoThingsAsync(CancellationToken cancellationToken)
{
    // Depending on what you are doing under the covers, this may cause unintended
    // consequences such as exhaustion of outgoing sockets or database connections.
    var thing1Task = FirstAsync(cancellationToken);
    var thing2Task = SecondAsync(cancellationToken);
    await Task.WhenAll(thing1Task, thing2Task);

    // Prefer sequential execution of asynchronous calls
    await FirstAsync(cancellationToken);
    await SecondAsync(cancellationToken);
}
```

Using async everywhere generally pays off without having to make any individual piece of code faster via parallelization. When threads aren't blocking you can achieve higher performance with the same amount of CPU.

### Avoid Task.Factory.StartNew, and use Task.Run only when needed

Even in the cases where not immediately awaiting is safe, you should avoid `Task.Factory.StartNew`, and only use `Task.Run` when you need to run some CPU-bound code asynchronously.

The main way `Task.Factory.StartNew` is dangerous is that it can look like tasks are awaited when they aren't. For example, if you `async`-ify the following code:

```csharp
Task.WhenAll(Task.Factory.StartNew(Foo), Task.Factory.StartNew(Foo2)).Wait();
```

be careful because changing the delegate to one that returns `Task`, `Task.Factory.StartNew` will now return `Task<Task>`. Awaiting only the outer task will only wait until the actual task starts, not finishes.

```csharp
// BAD: Only waits until all tasks have been scheduled, not until the actual work has completed
await Task.WhenAll(Task.Factory.StartNew(FooAsync), Task.Factory.StartNew(Foo2Async));
```

Normally what you want to do, when you know delegates are not CPU-bound, is to just use the delegates themselves. This is almost always the right thing to do.

```csharp
// GOOD: Will wait until the tasks have all completed
await Task.WhenAll(FooAsync(), Foo2Async());
```

However, if you are certain the delegates are CPU-bound, and you want to offload this to the thread pool, you can use `Task.Run`. It's designed to support async delegates. I'd still recommend reading [Task.Run Etiquette and Proper Usage](https://blog.stephencleary.com/2013/10/taskrun-etiquette-and-proper-usage.html) for a more thorough explanation.

```csharp

// Ok if FooAsync is known to be primarily CPU-bound (especially before going async).
// Will schedule the CPU-bound work like Task.Factory.StartNew does,
// and automatically convert Task<Task> into a 'proxy' Task that represents the actual work
await Task.WhenAll(Task.Run(FooAsync), Task.Run(Foo2Async))
```

If, for some extremely unlikely reason, you really do need to use `Task.Factory.StartNew` you can use `Unwrap()` or `await await` to convert a `Task<Task>` into a `Task` that represents the actual work. I'd recommend reading [Task.Run vs Task.Factory.StartNew](https://devblogs.microsoft.com/pfxteam/task-run-vs-task-factory-startnew/) for a deeper dive into the topic.

## Null conditionals

Using the null conditional operator with awaitables can be dangerous. Awaiting null throws a `NullReferenceException`.

```csharp
// BAD: Will throw NullReferenceException if foo is null
await foo?.DoStuffAsync()
```

Instead, you must do a manual check first.

```csharp
// GOOD
if (foo != null)
{
    await foo.DoStuffAsync();
}
```

A [Null-conditional await](https://github.com/dotnet/csharplang/issues/35) is currently under consideration for future versions of C#, but until then you're stuck with manually checking.
