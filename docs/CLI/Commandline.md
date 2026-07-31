---
id: cli
title: CLI

---

# CLI 

## Introduction

A Command Line Interface (CLI) tool called `vcctl` is provided for you to manage Volcano resources such as jobs and queues.

## Installation

### Prerequisites

- [Go](https://golang.org/doc/install) (version matching the project's `go.mod`)
- [Git](https://git-scm.com/)

### Building from source

1. Clone the Volcano repository:

   ```bash
   git clone https://github.com/volcano-sh/volcano.git
   cd volcano
   ```
   

2. Build the `vcctl` binary:

   ```bash
   make vcctl
   ```

3. The binary will be generated in the `_output/bin/` directory. Copy it to a directory in your `$PATH`:

   ```bash
   sudo cp _output/bin/vcctl /usr/local/bin/
   ```

4. Verify the installation:

   ```bash
   vcctl --help
   ```

## Command Line Reference

### Listing all jobs

```bash
vcctl job list
```

Example output:

```
Name    Creation       Phase       JobType     Replicas    Min   Pending   Running   Succeeded   Failed    Unknown     RetryCount
job-1   2020-09-01     Running     Batch       1           1     0         1         0           0         0           0        
```

### Deleting a specific job

```bash
vcctl job delete --name job-name [--namespace job-namespace]
```

Example:

```bash
vcctl job delete --name job-1 --namespace default
# Output: delete job job-1 successfully
```

### Suspending a job

```bash
vcctl job suspend --name job-name [--namespace job-namespace]
```

Example:

```bash
vcctl job suspend --name job-1 --namespace default
```

### Resuming a job

Resume a suspended job (opposite of `vcctl job suspend`):

```bash
vcctl job resume --name job-name [--namespace job-namespace]
```

Example:

```bash
vcctl job resume --name job-1 --namespace default
```

### Running a job

```bash
vcctl job run --name job-name [--namespace job-namespace]
```

Example:

```bash
vcctl job run --name job-1 --namespace default
```

## Additional Help

For more information about Volcano command lines, run the following commands:

```bash
vcctl -h
vcctl [command] -h
```