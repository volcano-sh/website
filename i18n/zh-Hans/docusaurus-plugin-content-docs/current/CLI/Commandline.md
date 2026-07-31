---
id: cli
title: CLI
---

# CLI

## 简介

Volcano提供了一个名为 `vcctl` 的命令行工具用于管理资源，如作业（jobs）和队列（queues）。

## 安装

### 先决条件

- [Go](https://golang.org/doc/install) (版本需与项目的 `go.mod` 匹配)
- [Git](https://git-scm.com/)

### 从源码构建

1. 克隆 Volcano 代码库：

   ```bash
   git clone https://github.com/volcano-sh/volcano.git
   cd volcano
   ```

2. 构建 `vcctl` 二进制文件：

   ```bash
   make vcctl
   ```

3. 二进制文件将生成在 `_output/bin/` 目录下。将其复制到您的 `$PATH` 目录中：

   ```bash
   sudo cp _output/bin/vcctl /usr/local/bin/
   ```

4. 验证安装：

   ```bash
   vcctl --help
   ```

## 命令行参考

### 列举所有的 Job

```bash
vcctl job list
```

输出示例：

```
Name    Creation       Phase       JobType     Replicas    Min   Pending   Running   Succeeded   Failed    Unknown     RetryCount
job-1   2020-09-01     Running     Batch       1           1     0         1         0           0         0           0
```

### 删除指定的 Job

```bash
vcctl job delete --name job-name [--namespace job-namespace]
```

示例：

```bash
vcctl job delete --name job-1 --namespace default
# Output: delete job job-1 successfully
```

### 挂起（中止）一个 Job

```bash
vcctl job suspend --name job-name [--namespace job-namespace]
```

示例：

```bash
vcctl job suspend --name job-1 --namespace default
```

### 恢复一个 Job

恢复一个被挂起的 Job (与 `vcctl job suspend` 相反)：

```bash
vcctl job resume --name job-name [--namespace job-namespace]
```

示例：

```bash
vcctl job resume --name job-1 --namespace default
```

### 运行一个 Job

```bash
vcctl job run --name job-name [--namespace job-namespace]
```

示例：

```bash
vcctl job run --name job-1 --namespace default
```

## 说明事项

如需获取更多命令行详情请按如下操作:

```bash
vcctl -h
vcctl [command] -h
```