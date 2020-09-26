+++
title = "贡献"


date = 2019-01-28
lastmod = 2020-09-04

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "向volcano做贡献"
[menu.1-0]
  parent = "contribution"
  weight = 1
+++

# 欢迎

欢迎来到Volcano!

-   [上手必读](#before-you-get-started)
    -   [代码管理](#code-of-conduct)
    -   [社区要求](#community-expectations)
-   [开始](#getting-started)
-   [您的第一个贡献](#your-first-contribution)
    -   [寻找您感兴趣的领域开展工作](#find-something-to-work-on)
        -   [寻找一个话题](#find-a-good-first-topic)
        -   [围绕一个Issue开展工作](#work-on-an-issue)
        -   [提交Issue](#file-an-issue)
-   [贡献者工作流程](#contributor-workflow)
    -   [创建Pull Requests](#creating-pull-requests)
    -   [代码检视](#code-review)
    -   [测试](#testing)

# 上手必读

## 代码管理

请务必关注和阅读我们的[代码管理](https://github.com/volcano-sh/website/blob/master/CODE_OF_CONDUCT.md)

## 社区要求

Volcano是一个社区驱动的开源项目，致力于打造健康、友好和富有成效的环境。
社区的目标是开发Volcano系统，该系统有助于在Kubernetes上运行高性能的工作负载，如AI、ML、深度学习应用程序。要建立这样一个系统，需要有共同目标的社
区贡献者的支持。

- 请查看 [社区角色](https://github.com/volcano-sh/website/blob/master/content/en/docs/community-membership.md) 了解社区角色的
具体情况。随着贡献度的提高，您的角色会逐渐升级。


# 开始

- 查看[安装文档](https://github.com/volcano-sh/website/blob/master/content/en/docs/deployment.md) 了解更多关于编译和部署的细节.


# 您的第一个贡献

我们将会帮助您在不同的领域做出贡献，如处理issue、开发特性、修复关键bug、检视您的代码并合入。

如果您对开发流程还有疑问，请查看[Slack Channel](https://volcano-sh.slack.com)( 注册[点击这里](https://join.slack.com/t/volcano-sh/shared_invite/enQtNTU5NTU3NDU0MTc4LTgzZTQ2MzViNTFmNDg1ZGUyMzcwNjgxZGQ1ZDdhOGE3Mzg1Y2NkZjk1MDJlZTZhZWU5MDg2MWJhMzI3Mjg3ZTk))，
也可以加入我们的[mailing list](https://groups.google.com/forum/#!forum/volcano-sh) 。

## 寻找您感兴趣的领域开展工作

我们会一直需要您的帮助，如文档更新、上报bug或是编写代码。
试试寻找那些没有遵循最佳编码实践、需要代码重构或是缺少测试用例的地方吧。
下面的样例指导您如何开始。

### 寻找一个话题

在Volcano组织下有[多个仓库](https://github.com/volcano-sh/)。
每个仓库都有针对新人友好的第一个issue实践。
举个例子，[Volcano-Issues](https://github.com/volcano-sh/volcano) 中具有 [help wanted](https://github.com/volcano-sh/volcano/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22)
和 [good first issue](https://github.com/volcano-sh/volcano/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22)
标签的issue一般不需要您对Volcano有非常多的了解即可开始工作。
我们会帮助新的贡献者针对这类issue开展工作。
另一个开始贡献的好办法是寻找一个待完善的文档，比如一个缺少超链接或超链接不可用的文档。请查看[Contributing](#contributing) 下方的工作流程。


#### 围绕一个Issue开展工作

当您有意愿针对某个issue开展工作时，您可以将这个issue分配给自己。在issue下回复`/assign` 或是 `/assign @yourself`即可。机器人将会把这个issue
分配给您，您的昵称将会出现在被分配者列表中。

### 提交Issue

我们不仅估计大家贡献代码，也非常欢迎大家提交issue。
issue需要被提交到Volcano的对应子仓库中。

举个例子：在Volcano中开启一个issue[Volcano](https://github.com/volcano-sh/volcano/issues) 。

开启一个issue时，请遵循默认的提交指南。

# 贡献者工作流程

非常欢迎您提问题或是提交pull request。

这里有一份贡献者工作流程的大纲供您参考：

- 基于已有分支创建一个自定义分支，通常是基于master分支
- 做一些修改后创建commit
- 请确保commit信息符合正确的格式
- 将本地个人自定义分支的改动提交到远程个人库
- 提交的PR必须得到至少2个社区维护者的approval才能合入

## 创建Pull Requests

Pull requests经常被简称为“PR”。
Volcano遵循标准的[github pull request](https://help.github.com/articles/about-pull-requests/) 流程。

在上述流程中，volcano机器人会对您的PR加入结构化标签。

Volcano机器人也会给出一些有用的命令建议，这些命令将会在你的PR中运行以提示检视代码。
可以在注释中输入这些“/command”选项来触发自动标记和通知。

## 代码检视

为了使您的PR更容易的被检视，您需要做到以下几点：

* 遵循[好代码编写指南](https://github.com/golang/go/wiki/CodeReviewComments) 。
* 撰写[合规的commit messages](https://chris.beams.io/posts/git-commit/)
* 将较大的修改分解成若干个逻辑独立的小的修改，这样会使得这些修改更容易被理解，统一起来可以解决一个较大的问题。
* 给PR打上标签以关联到合适的检视人：阅读机器人发给你的指引你完成PR流程的提示信息有助于做到这一点。


### commit信息的格式

我们对提交消息遵循一个粗略的约定，旨在回答两个问题：做了哪些修改，为什么做这些修改。
主题中应该描述做了什么，commit中应该描述为什么做这些。

```shell
scripts: add test codes for metamanager

this add some unit test codes to imporve code coverage for metamanager

Fixes #12
```

也可以采用以下更加正式的格式:

```shell
<subsystem>: <what changed>
<BLANK LINE>
<why this change was made>
<BLANK LINE>
<footer>
```

第一行是主题并且不多于70个字符，第二行通常是空白行，其他行一般不超过80个字符。这样会使得commit信息在github上更容易被阅读。

请注意：如果您的pull request没有获得足够的关注，您可以通过Slack寻找检视人。

## 测试

这里有多种测试类型。
测试代码的位置因类型而异，成功运行测试所需的环境细节也会有所不同：

* 单元测试：用于确认某个特定函数的行为是否符合预期。单元测试源代码可以在给定包中的对应源代码附近找到。任何开发人员都可以轻松地在本地运行这些程序。
* 集成测试：这些测试包括包组件的交互，或者Volcano组件和Kubernetes控制平面组件（如API服务器）之间的交互。
* 端到端测试("e2e")：宏观层面的系统一致性测试。Volcano e2e测试用例位于：[Volcano e2e](https://github.com/volcano-sh/volcano/tree/master/test/e2e)。

当PR提交时会始终运行这些测试用例。
