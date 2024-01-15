+++
title = "CLI"


date = 2024-01-16
lastmod = 2024-01-16

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "Commandline"
[menu.v1-8-2]
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
### Listing all jobs
vcctl job list

```html
# vcctl job list
Name    Creation       Phase       JobType     Replicas    Min   Pending   Running   Succeeded   Failed    Unknown     RetryCount
job-1   2020-09-01     Running     Batch       1           1     0         1         0           0         0           0        
```

### Deleting a specific job
vcctl job delete --name job-name [--namespace job-namespace] 

```html
# vcctl delete job --name job-1 --namespaces default
delete job job-1 successfully
```

### Suspending a job
vcctl job suspend --name job-name [--namespace job-namespace]

```html
# vcctl job suspend --name job-1 --namespace default
```

### Resuming a job (opposite to "vcctl job suspend")
vcctl job resume --name job-name [--namespace job-namespace]

```html
# vcctl job resume --name job-1 --namespace default
```

### Running a job
vcctl job run --name job-name [--namespace job-namespace]

```html
# vcctl job run --name job-1 --namespace default
```

## Note
For more information about Volcano command lines, run the following commands:

```html
# vcctl -h
# vcctl [command] -h
```
