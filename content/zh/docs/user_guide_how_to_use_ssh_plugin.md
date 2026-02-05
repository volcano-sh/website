++
title = "Volcano Job 插件 -- SSH 用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_ssh_plugin/"
[menu.docs]
  parent = "user-guide"
++

## 背景

**SSH 插件** 用于在同一个 Volcano Job 内，为 Pod 之间提供免密 SSH 登录能力，这在诸如 [MPI](https://www.open-mpi.org/) 等工作负载中非常常见。  
该插件通常与 `SVC` 插件配合使用。

## 关键点

* 如果配置了 `ssh-key-file-path`，请确保该目录下存在正确的私钥与公钥；大多数场景建议使用默认值；
* 如果配置了 `ssh-private-key` 或 `ssh-public-key`，请确保其内容为合法的密钥；也同样建议在大多数情况下使用默认密钥；
* 一旦启用了 `SSH` 插件，会自动创建一个名称为 `job-name-ssh` 的 Secret，其中包含：
  - `authorized_keys`
  - `id_rsa`
  - `config`
  - `id_rsa.pub`
  该 Secret 会以卷（volume）形式挂载到 Job 下的所有容器（包括 initContainers）中；
* 默认情况下，可以在 `/root/.ssh/config` 中看到作业内所有主机名与子域名的映射；
* 启用 `SSH` 插件后，可以在 Job 内任意 Pod 中使用 `ssh hostname` 的方式免密登录其他 Pod。

## 参数

| ID | 名称                | 类型   | 默认值               | 必须 | 描述                            | 示例 |
|----|---------------------|--------|----------------------|------|---------------------------------|------|
| 1  | `ssh-key-file-path` | String | `/root/.ssh`         | 否   | 存放 SSH 私钥与公钥的路径       | `ssh: ["--ssh-key-file-path=/home/user/.ssh"]` |
| 2  | `ssh-private-key`   | String | DEFAULT_PRIVATE_KEY  | 否   | 私钥内容字符串                  | 参见下方示例 |
| 3  | `ssh-public-key`    | String | DEFAULT_PUBLIC_KEY   | 否   | 公钥内容字符串                  | 参见下方示例 |

> 由于 `DEFAULT_PRIVATE_KEY` 和 `DEFAULT_PUBLIC_KEY` 内容较长，文档中仅给出了示例片段，具体值可参考原始示例。

## 说明

* `DEFAULT_PRIVATE_KEY` 与 `DEFAULT_PUBLIC_KEY` 在文档中未完整列出，请参考示例获取完整内容；
* Volcano 不会对 `ssh-key-file-path` 的合法性进行校验，请确保路径有效；
* 在大多数场景下建议保持参数为空，使用默认行为，此时 Volcano 会自动生成一对 SSH 密钥并完成配置。

## 示例

```yaml
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: mpi-job
spec:
  minAvailable: 3
  schedulerName: volcano
  plugins:
    ssh: []   ## 注册 SSH 插件
    svc: []
  tasks:
    - replicas: 1
      name: mpimaster
      template:
        spec:
          containers:
            - command:
                - /bin/bash
                - -c
                - |
                  mkdir -p /var/run/sshd; /usr/sbin/sshd;
                  MPI_HOST=`cat /etc/volcano/mpiworker.host | tr "\n" ","`;
                  sleep 10;
                  mpiexec --allow-run-as-root --host ${MPI_HOST} -np 2 --prefix /usr/local/openmpi-3.1.5 python /tmp/gpu-test.py;
                  sleep 3600;
              image: lyd911/mindspore-gpu-example:0.2.0
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
                - /bin/bash
                - -c
                - |
                  mkdir -p /var/run/sshd; /usr/sbin/sshd -D; 
              image: lyd911/mindspore-gpu-example:0.2.0
              name: mpiworker
              resources:
                limits:
                  nvidia.com/gpu: "1"
              ports:
                - containerPort: 22
                  name: mpijob-port
              workingDir: /home
          restartPolicy: OnFailure
```

## 进一步说明

* 上述示例会创建一个包含 1 个 `master` 与 2 个 `worker` 的 MPI 作业；
* 由于启用了 `SVC` 插件，可以在任意 Pod 中通过环境变量获取所有主机信息；若使用默认 SSH 配置，也可以通过 `/root/.ssh/config` 查看所有主机：

```bash
[root@mpi-job-master-0 /]# cat /root/.ssh/config
StrictHostKeyChecking no
UserKnownHostsFile /dev/null
Host mpi-job-mpimaster-0
  HostName mpi-job-mpimaster-0.mpi-job
Host mpi-job-mpiworker-0
  HostName mpi-job-mpiworker-0.mpi-job
Host mpi-job-mpiworker-1
  HostName mpi-job-mpiworker-1.mpi-job
```

* 在 master Pod 中，可以直接使用 SSH 登录到 worker：

```bash
[root@mpi-job-master-0 /]# ssh mpi-job-mpiworker-0
...
root@mpi-job-mpiworker-0:~# 
```

## 注意事项

* 请确保所有容器中都已安装并启用了 `sshd` 服务。

