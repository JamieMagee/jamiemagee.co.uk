---
title: 7 tips for converting C# code to async/await
date: '2020-03-16'
comments: true
---

Over the past year I've moved from working mainly in Java, to working mainly in C#. To be honest, Java and C# have more in common than not, but one of the major differences is async/await. It's a really powerful tool if used correctly, but also a very quick way to shoot yourself in the foot.

Asynchronous programming looks very similar to synchronous programming. However, there are some core concepts which need to be understood in order to form a proper mental model when converting between synchronous and asynchronous programming patterns.

Here are some of the most common ones I've come across.

## Naming

Method names must use the suffix Async when returning a `Task` or `Task<T>`. Consistency is key as the `Async` suffix provides not only a mental signal to the caller that the await keyword should be used, but also provides a consistent naming convention.

```csharp
// Synchronous method
public void DoSomething() { … }

// Asynchronous method
public async Task DoSomethingAsync() { … }
```

## Return types

Every async method returns a `Task`. Use `Task` when there is no specific result for the method, which is synonymous with `void`. Use `Task<T>` when a return value is required.

```csharp
// Original method
public void DoSomething()
{
    using (var client = new HttpClient())
    {
        client.GetAsync().Result;
    }
}

// BAD: This utilizes an anti-pattern. async void provides no mechanism
// for the caller to observe the result, including exceptions.
public async void DoSomethingAsync()
{
    using (var client = new HttpClient())
    {
        await client.GetAsync();
    }
}

// GOOD: This provides proper access to the completion task. The caller may now
// await the method call and observe/handle results and exceptions correctly.
public async Task DoSomethingAsync()
{
    using (var client = new HttpClient())
    {
        await client.GetAsync();
    }
}
```
## Parameters

There is not a way for the compiler to manage `ref` and `out` parameters. (That's a topic for another time.) When multiple values need to be returned you should either use custom objects or a `Tuple`.

```csharp
// Original method
public bool TryGet(string key, out string value)
{
    value = null;
    if (!m_cache.TryGetValue(key, out value))
    {
        value = GetValueFromSource(key);
    }

    return value != null;
}

// New method
public async Task<(bool exists, string value)> TryGetAsync(string key)
{
    string value = null;
    if (!m_cache.TryGetValue(key, out value))
    {
        value = await GetValueFromSourceAsync(key);
    }

    return (value != null, value);
}
```

## Delegates

Following up on the lack of the `void` return type, no async method should be defined as an `Action` variant. When accepting a delegate to an asynchronous method, the asynchronous pattern should be propagated by accepting `Func<Task>` or `Func<Task<T>>`.

```csharp
public void TraceHelper(Action action)
{
    Trace.WriteLine("calling action");
    action();
    Trace.WriteLine("called action");
}

// Action => Func<Task>
// Action<T> maps to Func<T, Task>
// etc.
public async Task TraceHelperAsync(Func<Task> action)
{
    Trace.WriteLine("calling action");
    await action();
    Trace.WriteLine("called action");
}

// Example call to the method with a synchronous callback implementation
await TraceHelperAsync(() => { Console.WriteLine("Called me"); return Task.CompletedTask; });
```
## Virtual methods

In asynchronous programming there is no concept of a `void` return type, as the basis of the model is that each method returns a mechanism for signalling completion of the asynchronous work. When converting base classes which have empty implementations or return constant values, the framework provides methods and helpers to facilitate the pattern.

```csharp
// The original synchronous version of the class
public class MyClass
{
    protected virtual void DoStuff()
    {
        // Do nothing
    }

    protected virtual int GetValue()
    {
        return 0;
    }
}

// The converted asynchronous version of the class
public class MyClass
{
    protected virtual Task DoStuffAsync(CancellationToken cancellationToken)
    {
        // This static accessor avoids new allocations for synchronous 'no-op' methods such as this
        return Task.CompletedTask;
    }

    protected virtual Task<int> GetValueAsync(CancellationToken cancellationToken)
    {
        // This factory method returns a completed task with the specified result
        return Task.FromResult(0);
    }
}
```

## Interfaces

Like delegates, interfaces should always be declared async which ensures an async-aware model throughout the stack.

```cs
public interface IMyPlugin
{
    Task DoStuffAsync(CancellationToken cancellationToken);
    Task<int> DoMoreAsync(CancellationToken cancellationToken);
}

public class MyPluginImpl : IMyPlugin
{
    // When the method does not have a result, use the static accessor
    public Task DoStuffAsync(CancellationToken cancellationToken)
    {
        DoSomething();
        return Task.CompletedTask;
    }

    // When the method has a result, use the static factory function
    public Task<int> DoMoreAsync(CancellationToken cancellationToken)
    {
        DoSomething();
        return Task.FromResult(0);
    }
}
```

## Mocks

In certain cases, mostly unit test mocks, you may find the need to implement interfaces without having any reason to actually perform any asynchronous calls. In these specific cases it is OK to feign asynchronous execution using `Task.CompletedTask` or `Task.FromResult<T>(T result)`.

```cs
// Example mock implementation for testing. Moq is not smart enough to generate a non-null completed
// task by default, so you will need to explicitly mock out all methods
Mock<IMyPlugin> mockPlugin = new Mock<IMyPlugin>();

// When a constant value is returned
mockPlugin.Setup(x => x.DoStuffAsync(It.IsAny<CancellationToken>()).Returns(Task.CompletedTask);
mockPlugin.Setup(x => x.DoMoreAsync(It.IsAny<CancellationToken>()).ReturnsAsync(1);

// When a dynamic value is returned
mockPlugin.Setup(x => x.DoStuffAsync(It.IsAny<CancellationToken>()).Returns(() =>
{
     DoStuffImpl();
     return Task.CompletedTask;
});
mockPlugin.Setup(x => x.DoMoreAsync(It.IsAny<CancellationToken>()).Returns(() =>
{
     DoMoreImpl();
     return Task.FromResult(1);
});
```

## Summary

Overall asynchronous programming is much better for performance, but requires a slightly different mental model. I hope these tips help!
