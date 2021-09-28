+++
title =  "job plugins"

date = 2021-05-13
lastmod = 2021-05-13

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = " job plugins"
[menu.docs]
  parent = "scheduler"
  weight = 4

+++



### Why need Job plugins

Volcano's job has a lot of customization requirements. Considering the distributed training scenario, after multiple `pods` are running, they need network access to each other for data synchronization.

- env:A job contains multiple pods. In the form of environment variables, find the task whose POD belongs to the job and provide **index** for the task.

- svc:Supports pod communication. A typical scenario is the interaction between a parameter service node and a work node in a Tensorflow machine learning task. Provides network information, such as host files and headless services, needed for running jobs.

- ssh: Provides password-free authentication between tasks. A typical scenario is a HPC scenario based on the MPI framework.



### How to use Job plugin

Fill in the plugin field in the `configured yaml` to use the plugin and pass in the parameters. The default is no arguments.

```
spec:
	minAvailable:6
	schedulerName:volcano
	plugins:
		env:[]
		svc:[]
		ssh:[]
```

In `ssh []`, you can configure three parameters: `sshKeyFilePath`, `sshPrivateKey`, and `sshPublicKey`.

- `sshKeyFilePath` is the file path. The `mountRsaKey` function of the SSH Plugin configures `sshKeyFilePath` for each container.
- `sshPrivateKey` and `sshPublicKey` are keys. The `OnJobAdd` function of the ssh plugin checks whether the user has provided an RSA private key. If not (the default parameter table), `generateRsaKey` function of the ssh plugin is called.

In svc [], you can configure two parameters, like `publishNotReadyAddresses` and `disableNetworkPolicy`, which are Both Boolean parameters.

- `publishNotReadyAddresses` : This configuration field is assigned to the `PublishNotReadAddresses` field in the `createServiceIfNotExist`  function of the svc plugin. The default is true.
- `disableNetworkPolicy`：The default is true. If it is set to false in svc plugin ` OnJobAdd ` function will be called ` createNetworkPolicyIfNotExist ` to create a new network policy.



### Example for tensorflow on volcano

```
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: tensorflow-dist-mnist
spec:
  minAvailable: 3
  schedulerName: volcano
  plugins:
    env: []
    svc: []
  policies:
    - event: PodEvicted
      action: RestartJob
  tasks:
    - replicas: 1
      name: ps
      template:
        spec:
          containers:
            - command:
                - sh
                - "-c"
                - |
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' |sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' |sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_SHOT}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};

                  python /var/tf_dist_mnist/dist_mnist.py
              image: volcanosh/dist-mnist-tf-example:0.0.1
              name: tensorflow
              ports:
                - containerPort: 2222
                  name: tfjob-port
              resources:
                requests:
                  cpu: "200m"
          restartPolicy: Never
    - replicas: 2
      name: worker
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:

          containers:
            - command:
                - sh
                - "-c"
                - |
                  PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' |sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' |sed 's/^/"/;s/$/"/' | tr "\n" ","`;
                  export TF_CONFIG={\"cluster\":{\"ps\":[${PS_SHOT}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};
                  python /var/tf_dist_mnist/dist_mnist.py
              image: volcanosh/dist-mnist-tf-example:0.0.1
              name: tensorflow
              ports:
                - containerPort: 2222
                  name: tfjob-port
              resources:
                requests:
                  cpu: "200m"
              
          restartPolicy: Never
```

In the task configuration of a job, the Command field contains the configuration of the Job Plugin.

```
 PS_HOST=`cat /etc/volcano/ps.host | sed 's/$/&:2222/g' |sed 's/^/"/;s/$/"/' | tr "\n" ","`;
 WORKER_HOST=`cat /etc/volcano/worker.host | sed 's/$/&:2222/g' |sed 's/^/"/;s/$/"/' | tr "\n" ","`;
```

The svc plugin mounts all the ps (parameter server) host name information in the job to the `/etc/volcan/ps.host` file path. Similarly, worker information is configured in the next line.

```
export TF_CONFIG={\"cluster\":{\"ps\":[${PS_SHOT}],\"worker\":[${WORKER_HOST}]},\"task\":{\"type\":\"ps\",\"index\":${VK_TASK_INDEX}},\"environment\":\"cloud\"};
```

The env plugin uses `VK_TASK_INDEX` to find out what the task's index number is.



### Example for MPI on volcano

```
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: lm-mpi-job
spec:
  minAvailable: 3
  schedulerName: volcano
  plugins:
    ssh: []
    svc: []
  tasks:
    - replicas: 1
      name: mpimaster
      policies:
        - event: TaskCompleted
          action: CompleteJob
      template:
        spec:
          containers:
            - command:
                - /bin/sh
                - -c
                - |
                  MPI_HOST=`cat /etc/volcano/mpiworker.host | tr "\n" ","`;
                  mkdir -p /var/run/sshd; /usr/sbin/sshd;
                  mpiexec --allow-run-as-root --host ${MPI_HOST} -np 2 mpi_hello_world > /home/re;
              image: volcanosh/example-mpi:0.0.1
              name: mpimaster
              ports:
                - containerPort: 22
                  name: mpijob-port
              workingDir: /home
          restartPolicy: OnFailure
    - replicas: 2
      name: mpiworker
      template:
        spec:
          containers:
            - command:
                - /bin/sh
                - -c
                - |
                  mkdir -p /var/run/sshd; /usr/sbin/sshd -D;
              image: volcanosh/example-mpi:0.0.1
              name: mpiworker
              ports:
                - containerPort: 22
                  name: mpijob-port
              workingDir: /home
          restartPolicy: OnFailure
---
```

Mount ssh password-free login information file in the MPI_HOST field.

