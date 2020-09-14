title = "Command Line Introduction"

date = 2020-09-12
lastmod = 2020-09-12

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.

linktitle = "Commandline Introduction"
[menu.docs]
  parent = "cli"
  weight = 2

+++

# CommandLine of Volcano

The current version of Volcano commands mainly include **vcctl，vsub，vcancel，vsuspend，vresume，vjobs，vqueues** and so on.

We have implemented the command functions in Slurm, such as **sbatch，srun，scancel，scontrol，squeue**.

 Among them, we listed the following instructions:

| Volcano Command Format                         | Usage                                       |
| ---------------------------------------------- | ------------------------------------------- |
| vcctl job run -f <yaml_file>                   | run job by parameters from the command line |
| vsub -j/--job-name <job_file>                  | another form of running job by parameters   |
| vcancel -n <job_name> -N <namespace>           | delete a job                                |
| vsuspend -n <job_name> -N <namespace>          | suspend a job                               |
| vresume -n <job_name> -N <namespace>           | resume a job                                |
| vjobs -n <job_name> -N <namespace>             | show a job info                             |
| vcctl job list --all-namespaces                | list job info                               |
| vcctl job list -n <namespace>                  | view informations of jobs                   |
| vcctl queue create -n <queue_name> -w <weight> | create a queue                              |
| vcctl queue delete -n <queue_name>             | delete a queue                              |
| vqueues -n <queue_name>                        | get a queue                                 |
| vqueues                                        | list all the queue                          |

