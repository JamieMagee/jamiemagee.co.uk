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

{{< gist JamieMagee 40c8eb76e430c4803ffd225a22ccb0ad "Naming.cs" >}}

## Return types

Every async method returns a `Task`. Use `Task` when there is no specific result for the method, which is synonymous with `void`. Use `Task<T>` when a return value is required.

{{< gist JamieMagee 40c8eb76e430c4803ffd225a22ccb0ad "ReturnTypes.cs" >}}

## Parameters

There is not a way for the compiler to manage `ref` and `out` parameters. (That's a topic for another time.) When multiple values need to be returned you should either use custom objects or a `Tuple`.

{{< gist JamieMagee 40c8eb76e430c4803ffd225a22ccb0ad "Parameters.cs" >}}

## Delegates

Following up on the lack of the `void` return type, no async method should be defined as an `Action` variant. When accepting a delegate to an asynchronous method, the asynchronous pattern should be propagated by accepting `Func<Task>` or `Func<Task<T>>`.

{{< gist JamieMagee 40c8eb76e430c4803ffd225a22ccb0ad "Delegates.cs" >}}

## Virtual methods

In asynchronous programming there is no concept of a `void` return type, as the basis of the model is that each method returns a mechanism for signaling completion of the asynchronous work. When converting base classes which have empty implementations or return constant values, the framework provides methods and helpers to facilitate the pattern.

{{< gist JamieMagee 40c8eb76e430c4803ffd225a22ccb0ad "VirtualMethods.cs" >}}

## Interfaces

Like delegates, interfaces should always be declared async which ensures an async-aware model throughout the stack.

{{< gist JamieMagee 40c8eb76e430c4803ffd225a22ccb0ad "Interfaces.cs" >}}

## Mocks

In certain cases, mostly unit test mocks, you may find the need to implement interfaces without having any reason to actually perform any asynchronous calls. In these specific cases it is OK to feign asynchronous execution using `Task.CompletedTask` or `Task.FromResult<T>(T result)`.

{{< gist JamieMagee 40c8eb76e430c4803ffd225a22ccb0ad "Mocks.cs" >}}

## Summary

Overall asynchronous programming is much better for performance, but requires a slightly different mental model. I hope these tips help!
