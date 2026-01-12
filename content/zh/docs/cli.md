+++
title = "CLI"


date = 2019-01-28
lastmod = 2020-09-04

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "命令行"
[menu.docs]
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

### Job 命令

#### 列举所有的Job
```shell
vcctl job list [--namespace namespace] [--queue queue-name] [--all-namespaces]
```

```shell
# vcctl job list
Name    Creation       Phase       JobType     Replicas    Min   Pending   Running   Succeeded   Failed    Unknown     RetryCount
job-1   2020-09-01     Running     Batch       1           1     0         1         0           0         0           0
```

#### 查看Job详情
```shell
vcctl job view --name job-name [--namespace namespace]
```

#### 删除指定的Job
```shell
vcctl job delete --name job-name [--namespace namespace]
```

```shell
# vcctl job delete --name job-1 --namespace default
delete job job-1 successfully
```

#### 中止一个Job
```shell
vcctl job suspend --name job-name [--namespace namespace]
```

```shell
# vcctl job suspend --name job-1 --namespace default
```

#### 恢复一个Job (与"vcctl job suspend"相反)
```shell
vcctl job resume --name job-name [--namespace namespace]
```

```shell
# vcctl job resume --name job-1 --namespace default
```

#### 运行一个Job
```shell
vcctl job run --name job-name [--namespace namespace]
```

```shell
# vcctl job run --name job-1 --namespace default
```

### Queue 命令

#### 创建队列
```shell
vcctl queue create --name queue-name [--weight weight] [--state state]
```

```shell
# vcctl queue create --name test-queue --weight 1 --state Open
```

#### 列举所有队列
```shell
vcctl queue list
```

#### 获取队列信息
```shell
vcctl queue get --name queue-name
```

#### 操作队列
```shell
vcctl queue operate --name queue-name --action action [--weight weight]
```

有效操作：`open`, `close`, `update`

```shell
# vcctl queue operate --name test-queue --action open
# vcctl queue operate --name test-queue --action close
# vcctl queue operate --name test-queue --action update --weight 2
```

#### 删除队列
```shell
vcctl queue delete --name queue-name
```

### JobFlow 命令

#### 创建JobFlow
```shell
vcctl jobflow create --file file-path
```

#### 列举所有JobFlow
```shell
vcctl jobflow list [--namespace namespace] [--all-namespaces]
```

#### 获取JobFlow信息
```shell
vcctl jobflow get --name jobflow-name [--namespace namespace]
```

#### 描述JobFlow
```shell
vcctl jobflow describe --name jobflow-name [--namespace namespace] [--format yaml|json]
```

#### 删除JobFlow
```shell
vcctl jobflow delete --name jobflow-name [--namespace namespace] [--file file-path]
```

### JobTemplate 命令

#### 创建JobTemplate
```shell
vcctl jobtemplate create --file file-path
```

#### 列举所有JobTemplate
```shell
vcctl jobtemplate list [--namespace namespace]
```

#### 获取JobTemplate信息
```shell
vcctl jobtemplate get --name jobtemplate-name [--namespace namespace]
```

#### 描述JobTemplate
```shell
vcctl jobtemplate describe --name jobtemplate-name [--namespace namespace] [--format yaml|json]
```

#### 删除JobTemplate
```shell
vcctl jobtemplate delete --name jobtemplate-name [--namespace namespace] [--file file-path]
```

### Pod 命令

#### 列举Pod
```shell
vcctl pod list [--namespace namespace] [--job job-name] [--queue queue-name] [--all-namespaces]
```

```shell
# vcctl pod list --job job-1 --namespace default
# vcctl pod list --queue test-queue --namespace default
```

### Version 命令

#### 显示版本信息
```shell
vcctl version
```

## 说明事项
如需获取更多命令行详情请按如下操作:

```shell
# vcctl -h
# vcctl [command] -h
```
