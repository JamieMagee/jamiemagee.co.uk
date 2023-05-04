---
title: How to host your Helm chart repository on GitHub
date: '2020-04-02'
comments: true
---

Since the release of Helm 3, the official [helm/charts](https://github.com/helm/charts) repository has been deprecated in favour of [Helm Hub](https://hub.helm.sh/). While it's great for decentralization and the long term sustainability of the project, I think there's a lot more that is lost. Where is the best place to go for of the expert advice now? Installing Helm now requires you to manually add each repository you use. And there's now some added friction to hosting your Helm charts.

Thankfully GitHub has all the tools required, in the form of [GitHub Pages](https://pages.github.com/) and [GitHub Actions](https://github.com/features/actions), to host a fully automated build pipeline and to host a repository for your Helm charts. Also, we can use some of the tools from the community to ensure our charts are high quality.

## GitHub Pages

First you need to go ahead and create a `gh-pages` branch in your repository. As I'm writing this there's [an issue](https://github.com/helm/chart-releaser-action/issues/10) open to do this automatically, but to do it manually you can run the following:

```bash
git checkout --orphan gh-pages
git rm -rf .
git commit -m "Initial commit" --allow-empty
git push
```

Once you've done that, you need to enable GitHub Pages in your repository. Go to the settings page on your repository and set the source branch to the `gh-pages` branch you just created.

![GitHub Pages](/img/github-pages.png)

Now you've configured GitHub Pages, it will act as your Helm repository. Next, you need to configure GitHub Actions to publish to there.

## GitHub Actions

You're going to use GitHub Actions to create two workflows: one for pull requests, and one for commits to master. Your pull request workflow will deal with linting and testing your chart using a collection of automated tooling. While this isn't a direct replacement for the expert advice offered by the Helm community, it's better than nothing. Your master branch workflow will deal with releasing your charts using GitHub pages, meaning you never have to do it manually.

First up let's look at the pull request workflow.

## Pull requests

For each pull request in your chart repository, you want to run a series of different validation and linting tools to catch any avoidable mistakes in your Helm charts. To do that, go ahead and create a workflow in your repository by creating a file at `.github/workflows/ci.yaml` and add the following YAML to it:

```yaml
name: Lint and Test Charts

on:
  pull_request:
    paths:
      - 'charts/**'

jobs:
```

This will run the workflow on any pull request that changes files under the charts directory.

That's the skeleton of the workflow sorted, next onto the tools that you're going to use.

### Chart Testing

The Helm project created Chart Testing, AKA `ct`, as a comprehensive linting tool for Helm charts. To use it in your pull request build, you'll go ahead and add the following job:

```yaml
lint-chart:
  runs-on: ubuntu-latest
  steps:
    - name: Checkout
      uses: actions/checkout@v1
    - name: Run chart-testing (lint)
      uses: helm/chart-testing-action@master
      with:
        command: lint
        config: .github/ct.yaml
```
Where `ct.yaml` is:

```yaml
helm-extra-args: --timeout 600
check-version-increment: true
debug: true
```

For a full list of configuration options check out this [sample file](https://github.com/helm/chart-testing/blob/master/pkg/config/test_config.yaml).

The `lint` action for Chart Testing is a bit of a catch-all that helps you prevent a lot of potential bugs or mistakes in your charts. That includes:

- Version checking
- YAML schema validation on `Chart.yaml`
- YAML linting on `Chart.yaml` and `values.yaml`
- Maintainer validation on changed charts

### Helm-docs

Helm-docs isn't strictly a linting tool, but it makes sure that your documentation stays up-to-date with the current state of your chart. It requires that you create a `README.md.gotmpl` in each chart repository using the [available templates](https://github.com/norwoodj/helm-docs#available-templates), otherwise it will create a `README.md` for you using a default template.

To use it as part of your pull request build, you need to add the following job:

```yaml
lint-docs:
  runs-on: ubuntu-latest
  needs: lint-chart
  steps:
    - name: Checkout
      uses: actions/checkout@v1
    - name: Run helm-docs
      run: .github/helm-docs.sh
```

Where [`helm-docs.sh`](http://helm-docs.sh) is:

```bash
#!/bin/bash
set -euo pipefail

HELM_DOCS_VERSION="0.11.0"

# install helm-docs
curl --silent --show-error --fail --location --output /tmp/helm-docs.tar.gz https://github.com/norwoodj/helm-docs/releases/download/v"${HELM_DOCS_VERSION}"/helm-docs_"${HELM_DOCS_VERSION}"_Linux_x86_64.tar.gz
tar -xf /tmp/helm-docs.tar.gz helm-docs

# validate docs
./helm-docs
git diff --exit-code
```

This runs Helm-docs against each chart in your repository and generates the `README.md` for each one. Then, using git, you'll fail the build if there are any differences. This ensures that you can't check in any changes to your charts without also updating the documentation.

### Kubeval

Next up is Kubeval. It validates the output from Helm against schemas generated from the Kubernetes OpenAPI specification. You're going to add it to your pull request, and use it to validate across multiple different versions of Kubernetes. Add the following job:

```yaml
kubeval-chart:
  runs-on: ubuntu-latest
  needs:
    - lint-chart
    - lint-docs
  strategy:
    matrix:
      k8s:
        - v1.12.10
        - v1.13.12
        - v1.14.10
        - v1.15.11
        - v1.16.8
        - v1.17.4
  steps:
    - name: Checkout
      uses: actions/checkout@v1
    - name: Run kubeval
      env:
        KUBERNETES_VERSION: ${{ matrix.k8s }}
      run: .github/kubeval.sh
```

Where [`kubeval.sh`](http://kubeval.sh) is:

```bash
#!/bin/bash
set -euo pipefail

CHART_DIRS="$(git diff --find-renames --name-only "$(git rev-parse --abbrev-ref HEAD)" remotes/origin/master -- charts | grep '[cC]hart.yaml' | sed -e 's#/[Cc]hart.yaml##g')"
KUBEVAL_VERSION="0.14.0"
SCHEMA_LOCATION="https://raw.githubusercontent.com/instrumenta/kubernetes-json-schema/master/"

# install kubeval
curl --silent --show-error --fail --location --output /tmp/kubeval.tar.gz https://github.com/instrumenta/kubeval/releases/download/"${KUBEVAL_VERSION}"/kubeval-linux-amd64.tar.gz
tar -xf /tmp/kubeval.tar.gz kubeval

# validate charts
for CHART_DIR in ${CHART_DIRS}; do
  helm template "${CHART_DIR}" | ./kubeval --strict --ignore-missing-schemas --kubernetes-version "${KUBERNETES_VERSION#v}" --schema-location "${SCHEMA_LOCATION}"
done
```

This script is a bit longer, but if you break it down step-by-step it's essentially:

1. Get a list of charts that have been changed between this PR and master branch
2. Install Kubeval
3. For each chart:
   1. Generate the Kubernetes configuration using Helm
   2. Validatate the configuration using Kubeval

You're doing this for each version of Kubernetes you've defined in the job, so if you're using an API that isn't available in all versions, Kubeval will fail the build. This help keep backwards compatibility for all of your charts, and makes sure you're not releasing breaking changes accidentally.

This doesn't guarantee that the chart will actually install successfully on Kubernetes—but that's where Kubernetes in Docker comes in.

### Kubernetes in Docker (KIND)

Finally you're going to use Chart Testing again to install your Helm charts on a Kubernetes cluster running in the GitHub Actions runner using Kubernetes in Docker (KIND). Like Kubeval, you can create clusters for different versions of Kubernetes.

KIND doesn't publish Docker images for each version of Kubernetes, so you need to look at the Docker [image tags](https://hub.docker.com/r/kindest/node/tags). That's why the Kubernetes versions in this job won't necessarily match the versions used for the Kubeval job.

```yaml
install-chart:
  name: install-chart
  runs-on: ubuntu-latest
  needs:
    - lint-chart
    - lint-docs
    - kubeval-chart
  strategy:
    matrix:
      k8s:
        - v1.12.10
        - v1.13.12
        - v1.14.10
        - v1.15.7
        - v1.16.4
        - v1.17.2
  steps:
    - name: Checkout
      uses: actions/checkout@v1
    - name: Create kind ${{ matrix.k8s }} cluster
      uses: helm/kind-action@master
      with:
        node_image: kindest/node:${{ matrix.k8s }}
    - name: Run chart-testing (install)
      uses: helm/chart-testing-action@master
      with:
        command: install
        config: .github/ct.yaml
```

So you got a temporary Kubernetes cluster, installed your charts on it, and ran any [helm tests](https://helm.sh/docs/topics/chart_tests/) (that you definitely wrote 🙄). This is the ultimate test of your Helm chart—installing and running it. If this passes, and you merge your pull request, you're ready to release!

## Releasing

Remember that `gh-pages` branch you created earlier? Now you can use it to publish your fully tested Helm chart to.

You're going to create another GitHub workflow, this time at `.github/workflows/release.yaml`. This one is going to be significantly simpler:

```yaml
name: Release Charts

on:
  push:
    branches:
      - master
    paths:
      - 'charts/**'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v1
      - name: Configure Git
        run: |
          git config user.name "$GITHUB_ACTOR"
          git config user.email "$GITHUB_ACTOR@users.noreply.github.com"
      - name: Run chart-releaser
        uses: helm/chart-releaser-action@master
        env:
          CR_TOKEN: '${{ secrets.CR_TOKEN }}'
```

It will check out the repository, set the configuration of Git to the user that kicked-off the workflow, and run the chart releaser action. The chart releaser action will package the chart, create a release from it, and update the `index.yaml` file in the `gh-pages` branch. Simple!

But one thing you still need to do is create a secret in your repository, `CR_TOKEN`, which contains a GitHub [personal access token](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line#creating-a-token) with `repo` scope. This is due to a [GitHub Actions bug](https://github.community/t5/GitHub-Actions/Github-action-not-triggering-gh-pages-upon-push/m-p/31266/highlight/true#M743), where GitHub Pages is not deployed when pushing from GitHub Actions.

![GitHub Secrets](/img/github-secrets.png)

Once that's all configured, any time a change under the charts directory is checked in, like from a pull request, your Github workflow will run and your charts will be available almost instantly!

## Next steps

From here you'll want to add your repository to Helm so you can use it, and share it on [Helm Hub](https://hub.helm.sh/) so others can too. For the former, you'll need to run:

```bash
helm repo add renovate https://<username>.github.io/<repository>/
helm repo update
```

And for the latter, the Helm project have written [a comprehensive guide](https://github.com/helm/hub/blob/master/Repositories.md) that I couldn't possibly top.

If you want to see all these pieces working together checkout the [renovatebot/helm-charts](https://github.com/renovatebot/helm-charts) repository, or our page on [Helm Hub](https://hub.helm.sh/charts/renovate/renovate). And if you would like some help please reach out to me on Twitter at [@Jamie_Magee](https://twitter.com/Jamie_Magee).
