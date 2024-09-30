+++
title = "CLI"

date = 2024-09-29
lastmod = 2024-09-29

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "命令行"
[menu.v1-10-0]
  parent = "cli"
  weight = 1
+++

### 简介
Volcano提供了命令行工具用于管理资源。
## 配置

1. 您可以自己从 github 上克隆代码并在项目的根目录下执行以下命令制作最新的可执行文件：
```shell
# make vcctl
```
2. 将可执行文件拷贝到$PATH下以便您能在任何地方执行它。

## 命令行列表
### 列举所有的Job

```shell
# vcctl job list
Name    Creation       Phase       JobType     Replicas    Min   Pending   Running   Succeeded   Failed    Unknown     RetryCount
job-1   2020-09-01     Running     Batch       1           1     0         1         0           0         0           0
```

### 删除指定的Job

```shell
# vcctl delete job --name job-1 --namespaces default
delete job job-1 successfully
```

### 中止一个Job

```html
# vcctl job suspend --name job-1 --namespace default
```

### 消费一个Job (与"vcctl job suspend"相反)

```html
# vcctl job resume --name job-1 --namespace default
```

### 运行一个Job

```shell
# vcctl job run --name job-1 --namespace default
```

## 说明事项
如需获取更多命令行详情请按如下操作:

```html
# vcctl -h
# vcctl [command] -h
```
