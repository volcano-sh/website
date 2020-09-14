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
Volcano also provides commandline client to manage resources.
## Configuration

1. You can get commandline executable file **vcctl** from releases package **volcano-{version}-linux-gnu.tar.gz**. The 
file is under the path volcano-{version}-linux-gnu\bin\amd64 after unzipping the package. Of course, you can also make
your own executable file by cloning the code from github and execute the following command under the project root 
directory:
```
# make vcctl
``` 
2. Copy the executable file to $PATH so that you can use it anywhere.

## Commandline List
### list all jobs
vcctl job list

```html
# vcctl job list
Name    Creation       Phase       JobType     Replicas    Min   Pending   Running   Succeeded   Failed    Unknown     RetryCount
job-1   2020-09-01     Running     Batch       1           1     0         1         0           0         0           0        
```

### delete a job with job name
vcctl job delete --name job-name [--namespace job-namespace] 

```html
# vcctl delete job --name job-1 --namespaces default
delete job job-1 successfully
```

### abort a job
vcctl job suspend --name job-name [--namespace job-namespace]

```html
# vcctl job suspend --name job-1 --namespace default
```

### resume a job (opposite to "vcctl job suspend")
vcctl job suspend --name job-name [--namespace job-namespace]

```html
# vcctl job suspend --name job-1 --namespace default
```

### run a job
vcctl job run --name job-name [--namespace job-namespace]

```html
# vcctl job run --name job-1 --namespace default
```

## Note
For more details please type as follows:

```html
# vcctl -h
# vcctl [command] -h
```
