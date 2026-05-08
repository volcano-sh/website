+++
title = "CLI"


date = 2019-01-28
lastmod = 2020-09-01

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Commandline"
[menu.docs]
  parent = "cli"
  weight = 1
+++

## Introduction
A Command Line Interface (CLI) is provided for you to manage resources.
## Configuration

1. You can obtain the latest executable file by cloning the code from GitHub and running the following command in the root directory of the project:
```
# make vcctl
``` 
2. Copy the executable file to $PATH. You then can execute it anywhere.

## Command Line List

### Job Commands

#### Listing all jobs
```shell
vcctl job list [--namespace namespace] [--queue queue-name] [--all-namespaces]
```

```shell
# vcctl job list
Name    Creation       Phase       JobType     Replicas    Min   Pending   Running   Succeeded   Failed    Unknown     RetryCount
job-1   2020-09-01     Running     Batch       1           1     0         1         0           0         0           0        
```

#### Viewing a job
```shell
vcctl job view --name job-name [--namespace namespace]
```

#### Deleting a specific job
```shell
vcctl job delete --name job-name [--namespace namespace]
```

```shell
# vcctl job delete --name job-1 --namespace default
delete job job-1 successfully
```

#### Suspending a job
```shell
vcctl job suspend --name job-name [--namespace namespace]
```

```shell
# vcctl job suspend --name job-1 --namespace default
```

#### Resuming a job (opposite to "vcctl job suspend")
```shell
vcctl job resume --name job-name [--namespace namespace]
```

```shell
# vcctl job resume --name job-1 --namespace default
```

#### Running a job
```shell
vcctl job run --name job-name [--namespace namespace]
```

```shell
# vcctl job run --name job-1 --namespace default
```

### Queue Commands

#### Creating a queue
```shell
vcctl queue create --name queue-name [--weight weight] [--state state]
```

```shell
# vcctl queue create --name test-queue --weight 1 --state Open
```

#### Listing all queues
```shell
vcctl queue list
```

#### Getting a queue
```shell
vcctl queue get --name queue-name
```

#### Operating a queue
```shell
vcctl queue operate --name queue-name --action action [--weight weight]
```

Valid actions: `open`, `close`, `update`

```shell
# vcctl queue operate --name test-queue --action open
# vcctl queue operate --name test-queue --action close
# vcctl queue operate --name test-queue --action update --weight 2
```

#### Deleting a queue
```shell
vcctl queue delete --name queue-name
```

### JobFlow Commands

#### Creating a jobflow
```shell
vcctl jobflow create --file file-path
```

#### Listing all jobflows
```shell
vcctl jobflow list [--namespace namespace] [--all-namespaces]
```

#### Getting a jobflow
```shell
vcctl jobflow get --name jobflow-name [--namespace namespace]
```

#### Describing a jobflow
```shell
vcctl jobflow describe --name jobflow-name [--namespace namespace] [--format yaml|json]
```

#### Deleting a jobflow
```shell
vcctl jobflow delete --name jobflow-name [--namespace namespace] [--file file-path]
```

### JobTemplate Commands

#### Creating a jobtemplate
```shell
vcctl jobtemplate create --file file-path
```

#### Listing all jobtemplates
```shell
vcctl jobtemplate list [--namespace namespace]
```

#### Getting a jobtemplate
```shell
vcctl jobtemplate get --name jobtemplate-name [--namespace namespace]
```

#### Describing a jobtemplate
```shell
vcctl jobtemplate describe --name jobtemplate-name [--namespace namespace] [--format yaml|json]
```

#### Deleting a jobtemplate
```shell
vcctl jobtemplate delete --name jobtemplate-name [--namespace namespace] [--file file-path]
```

### Pod Commands

#### Listing pods
```shell
vcctl pod list [--namespace namespace] [--job job-name] [--queue queue-name] [--all-namespaces]
```

```shell
# vcctl pod list --job job-1 --namespace default
# vcctl pod list --queue test-queue --namespace default
```

### Version Command

#### Displaying version information
```shell
vcctl version
```

## Note
For more information about Volcano command lines, run the following commands:

```shell
# vcctl -h
# vcctl [command] -h
```
