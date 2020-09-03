# CommandLine of Volcano

现版本Volcano指令主要包含**vcctl，vsub，vcancel，vsuspend，vresume，vjobs，vqueues**。

分别实现开源项目Slurm中对应的**sbatch，srun，scancel，scontrol，squeue**指令功能。

其中，举例以下指令：

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

