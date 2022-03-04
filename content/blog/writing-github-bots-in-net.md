---
title: Writing GitHub bots in .NET
date: 2022-03-04T05:40:46.845Z
comments: true
---
For a while now the Octokit libraries for .NET have lagged behind the JavaScript libraries, especially when it comes to webhooks. Unfortunately, I needed a GitHub webhook client for an internal project, so I had to write my own. It wasn’t too much extra effort to open source it, and thus [Octokit.Webhooks](https://github.com/octokit/webhooks.net) was born!

I wanted to give a quick example of how to get up and running with `Octokit.Webhooks`, and what better way than to write a small GitHub bot?

## Setup

For this project, I’m going to be using [.NET 6.0](https://dotnet.microsoft.com/en-us/download/dotnet/6.0) and [ASP.NET’s new minimal APIs](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis?view=aspnetcore-6.0) to simplify setup. From a terminal I’m going to create a new web API project:

```bash
dotnet new webapi --output octokit-webhooks-sample
```

The default template is set up to be a weather forecast API, but I can simplify it a bit more for this sample. My `Program.cs` looks like this:

```jsx
var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.Run();
```

Next up I’m going to install the [Octokit.Webhooks.AspNetCore](https://www.nuget.org/packages/Octokit.Webhooks.AspNetCore/) package:

```jsx
dotnet add package Octokit.Webhooks.AspNetCore
```

This package consumes the Octokit.Webhooks package, which contains core functionality like deserializers and processors, and adds [ASP.NET](http://ASP.NET) Core specific code, like automatic API endpoint mapping and shared secret verification.

## Handling webhooks

Now that I’ve got my project set up, I need to create my own processor to handle incoming webhooks. `Octokit.Webhooks` ships with an abstract class called `WebhookEventProcessor` that does all the heavy lifting of deserializing incoming webhooks. All I need to do is to create my own class that inherits from it, and write some logic to act on the webhook events.

```csharp
using Octokit.Webhooks;
using Octokit.Webhooks.Events;
using Octokit.Webhooks.Events.IssueComment;

public sealed class MyWebhookEventProcessor : WebhookEventProcessor
{

  private readonly ILogger<MyWebhookEventProcessor> logger;

  public MyWebhookEventProcessor(ILogger<MyWebhookEventProcessor> logger)
  {
    this.logger = logger;
  }

  protected override Task ProcessIssueCommentWebhookAsync(WebhookHeaders headers, IssueCommentEvent issueCommentEvent, IssueCommentAction action)
  {
    this.logger.LogInformation(issueCommentEvent.Comment.Body);
    return Task.CompletedTask;
  }
}
```

I created a small class `MyWebhookEventProcessor` that inherits from `WebhookEventProcessor`, and has an override for `ProcessIssueCommentWebhookAsync` that logs out the comment body. I also get the headers and the action passed to this method, so I could write a switch case and have different handling for created, edited, and deleted actions, but this is enough for now.

I also need to hook up `MyWebhookEventProcessor` in my startup class. 

```csharp
using Octokit.Webhooks;
using Octokit.Webhooks.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<WebhookEventProcessor, MyWebhookEventProcessor>();

var app = builder.Build();

app.UseRouting();

app.UseEndpoints(endpoints =>
{
  endpoints.MapGitHubWebhooks();
});

app.Run();
```

This is enough to tell [ASP.NET](http://ASP.NET) to hook up dependency injection for `MyWebhookEventProcessor`, enable routing. It will also automatically add a route to handle incoming GitHub webhooks. By default it’s exposed at `/api/github/webhooks`, but you can use any route you’d like. `MapGitHubWebhooks` also accepts a shared secret which allows you to verify the content signature of GitHub webhooks.

That’s all the code required on my side. Now I just need to expose my service to the internet, and configure GitHub to start sending me webhooks.

## GitHub webhook configuration

For GitHub to be able to send me webhooks, my service needs to be publicly accessible to the internet. I recently discovered a neat little service to do this with nothing more than ssh: [localhost.run](https://localhost.run/).

If I run my app with `dotnet run` then I can find the port that it’s running on:

```csharp
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5002
```

And using [localhost.run](http://localhost.run) I can create a tunnel for that port:

```csharp
$ ssh -R 80:localhost:5002 nokey@localhost.run

...

b49b69845954b1.lhrtunnel.link tunneled with tls termination, https://b49b69845954b1.lhrtunnel.link
```

Now on GitHub if I visit the settings for a repository, and go to webhooks, I can create a new webhook configuration using that domain name.

![Creating a new GitHub Webhook](img/github-new-webhook.png)

Now all I need to do is create a comment on an issue in the same repository....

![A test issue comment](img/new-github-comment.png)

And it’ll get logged in my terminal!

```csharp
info: MyWebhookEventProcessor[0]
      Test comment
```

## Making it interactive

Logging things to the terminal is great and all, but to make it a bot it should really *do* something. For that I’ll need the `Octokit` package:

```csharp
dotnet add package Octokit
```

And I’ll use it in `MyWebhookEventProcessor` :

```csharp
private readonly GitHubClient client;

public MyWebhookEventProcessor(ILogger<MyWebhookEventProcessor> logger)
{
  this.logger = logger;
  this.client = new GitHubClient(new ProductHeaderValue("octokit-webhooks-sample"))
  {
    Credentials = new Credentials("...")
  };
}
```

For this example I’m using a personal access token. You can create your own [here](https://github.com/settings/tokens). If I were deploying this as a production service, I would probably use something a bit more robust, like a [GitHub App](https://docs.github.com/en/developers/apps/building-github-apps/authenticating-with-github-apps).

```csharp
protected override async Task ProcessIssueCommentWebhookAsync(WebhookHeaders headers, IssueCommentEvent issueCommentEvent, IssueCommentAction action)
{
  this.logger.LogInformation(issueCommentEvent.Comment.Body);
  await this.client.Issue.Comment.Create(
    repositoryId: issueCommentEvent.Repository.Id,
    number: (int)issueCommentEvent.Issue.Number,
    newComment: "Hello, world!"
  );
}
```

I need to do that cast from `long` to `int` because `Octokit` still has [an open PR](https://github.com/octokit/octokit.net/pull/2352) to convert all its IDs to `long`. I’ve also got to add the `async` modifier to my method, so I can `await` the issue comment creation method in Octokit.

Once I’ve done all that, I can create an issue comment on my repository on GitHub and my “bot” will reply!

![A reply from the bot](img/github-bot-reply.png)

## What next?

If you find the library useful or interesting, give it [a star on GitHub](https://github.com/octokit/webhooks.net). And create an issue or pull request if you find find a bug or have a feature request.

If you want to create a fully-fledged bot, check out the GitHub documentation on creating a [GitHub app](https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app). It’s the next progression from PATs, and allows you to more easily share your bot.