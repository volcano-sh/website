---
title: SSH

---


## 背景
**SSH 插件** 专为火山作业中的 Pod 无需密码登录而设计，这对于工作负载来说是必需的 
例如[MPI](https://www.open-mpi.org/)。它通常与“SVC”插件一起使用。

## 要点
* 如果配置了 `ssh-key-file-path`，请确保目标目录下存在私钥和公钥。
建议大多数情况下保留默认值。
* 如果配置了 `ssh-private-key` 或 `ssh-public-key`，请确保值正确。建议保持默认
大多数场景下的按键。
* 配置`SSH`插件后，将创建一个名称与作业名称和`-ssh`相结合的secret，其中包含
`authorized_keys`/`id_rsa`/`config` 和 `id_rsa.pub`。它将作为所有容器的卷安装到给定路径
（包括 initContainers）在作业中。
* 默认情况下，您可以在`/root/.ssh/config`中获取作业中的所有主机名。该文件包含主机名对
和子域。
* 如果配置了`SSH`插件，您可以通过`ssh主机名`无需密码登录同一作业中的任何其他pod。

## 参数
| ID  | 名称                 | 类型   | 默认值               | 是否必填 | 描述                                                | 示例                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|-----|----------------------|--------|---------------------|----------|-----------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1   | `ssh-key-file-path`  | String | `/root/.ssh`        | N        | 用于存储 ssh 私钥和公钥的路径。 | ssh: ["--ssh-key-file-path=/home/user/.ssh"]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2   | `ssh-private-key`    | String | DEFAULT_PRIVATE_KEY | N        | 私钥的输入字符串。                | ssh: ["--ssh-private-key=-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAyeyZjWDx5Na9bw1f61M4s+QlLT/kyrB37AR2j5Sb/A9hvJak\nLNQQpNC+KVfYNl4jePG+6lwHqye//pcC9+0SWsHWwgaahjMLnAthR2k8JAakNA9x\nV/wHz0YU99OKEetaOuxXpWZPXCHX0zuQO87YbdKzRbgxACirM3Phkwr7XLtQtWZk\nyXG34CQXZQWgBIS1Fl+PlGOpVpOPnWoZPMpbAK74i/Tz4sP8Zhqc6dya1hrbUwY3\nYfMZNYXpaAw7wWVjq8grfs0+Fl3SxHrzTXge2m+eZAZ6iPJ8cX4uYKxi0ZmxpM/a\ngI6Mmjq0MU75Vxpq22LaUvHIpOfX5UxhkrsxlwIDAQABAoIBAQDGOuIb6zpNn4rl\nBMpPqamW4LimjX08hrWUHGWQWyIu96LJk1GlOKMGSm8FA1odNZm5WApG5QYaPrG7\na+DcJ/7G3ljIrdbxPBd/n6RmiKcj7ukwuqBY8fFwyKo5CZEYOmagRfldRO1P02Gf\n22+jZ1MNrbWVElf4gfRgVLj0s+lEhFkzhi+QGMmMpjEJnnG98xxVGEvWMw1rnKJm\n3Gi771Gltbg3GuEPs3IeoBgba3EaHmSxJnBivAL4zsO8UUCAXB13cUiXx8qO7y1e\nCSWSenRmK2ugbL6v0co12O0n0pxF9xlJ6fALdRWzpJsFlN3ttkY9N5GrQc/pVjOa\nvqa172RRAoGBAOSAIMNLT6QjgYDk5Z7ZxjNnxH/lMso+cx6bxk9YMKRrw0fDQh8m\ncBAihXhuntCPDGhrzQ+Anqx4jJVDFqac0xBck90a8LmmzD0q72eDTCYPouDWe6DL\nJQAc/HDmIC13sADEXmGW3c0Qn4hjBnMd89ouYj7ZajU2sED2irPPc/HLAoGBAOI5\nruL4Q0FarGrP3a9z9EDrVJsK2OfSTaJ7rhZ+uvB838svbHU+4mEYPhx4PCwvrYyi\nFn4hyau003ZmLc1qTABjmwcO/PPiYyoRHJDUIIhiIyIL+id/G53uG2eTzqYtU6uS\nnAIB2rKwwhU8ek+zbJBLu5uxuxlf4mdZITdkwtXlAoGBALH3RQ02A9JgQQYFwP2G\nucLhx/6goX05RGoLg1na4w+8Sr0Cy+X9BvzaFkAlUBY5w700cOLpFyxXO48pUGP1\n8sFkiVmFGQZPbfUaEpn5ff6K4R3ijyk97xR2fvrjkR44gOEoECZL3XZQwx/zmFti\nccF1rNksdnb5oC8IliDTq4cfAoGANyy6asECJj5nLuXju5ccS3kZ+XZ70I6KQMbJ\nftMJ5P2P146JdU8RB31SKL9qbZxzR4mA0uKKvUYtDQN+yErUnoOsm9wb9Z+RcAEc\nZnZWOO02hGdHa7qkkbAxHuH91KnZbk8jnZm2LT7PFz7Y1fd80vSlnSOL7nRkU7B5\nWXlJy8ECgYA4g0wc0Jq8c1Q0FulMkOQqYRDXaDo34987L+mZ70i/RtdkKjK/IKJ9\n18UDCyEaDPD0BWBJGPejZkY8UD6FBG/5k7wNIbT7hHLRSRlw4iRmVX2hRVXrXzD8\nvc86Qyg2iG0JqkMAvRdH40amPKp5bW4VcfcvQo4TSsI972u12rgwtg==\n-----END RSA PRIVATE KEY-----\n"] |
| 3   | `ssh-public-key`     | String | DEFAULT_PUBLIC_KEY  | N        | 公钥的输入字符串。                 | ssh: ["--ssh-public-key=ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDJ7JmNYPHk1r1vDV/rUziz5CUtP+TKsHfsBHaPlJv8D2G8lqQs1BCk0L4pV9g2XiN48b7qXAerJ7/+lwL37RJawdbCBpqGMwucC2FHaTwkBqQ0D3FX/AfPRhT304oR61o67FelZk9cIdfTO5A7ztht0rNFuDEAKKszc+GTCvtcu1C1ZmTJcbfgJBdlBaAEhLUWX4+UY6lWk4+dahk8ylsArviL9PPiw/xmGpzp3JrWGttTBjdh8xk1heloDDvBZWOryCt+zT4WXdLEevNNeB7ab55kBnqI8nxxfi5grGLRmbGkz9qAjoyaOrQxTvlXGmrbYtpS8cik59flTGGSuzGX root@aiplatform"]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## 注意：
* `DEFAULT_PRIVATE_KEY` 和 `DEFAULT_PUBLIC_KEY` 未完整列出，因为它们太长。请参考示例
落后于案件。
* Volcano 不负责“ssh-key-file-path”的验证。所以请保证自己正确。
* 建议在大多数情况下保留空白并使用默认值，就像后面的示例一样。如果那样的话，
Volcano默认会帮助生成一对密钥并完成所有配置。

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
    ssh: []   ## SSH plugin register
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
## 注意：
* 此示例将创建一个包含 1 个 `master` 和 2 个 `worker` 的 MPI 作业。
* 由于启用了 `SVC` 插件，您可以通过环境变量获取任何 Pod 中的所有主机。此外，如果您使用默认的 SSH 配置，您还可以在 `/root/.ssh/config` 中获取这些主机。
```
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
* 您可以按如下方式在 master pod 中登录其他主机。
```
[root@mpi-job-master-0 /]# ssh mpi-job-mpiworker-0
Warning: Permanently added 'mpi-job-mpiworker-0.mpi-job,X.X.X.X' (ECDSA) to the list of known hosts.
Welcome to Ubuntu 18.04.3 LTS (GNU/Linux 3.10.0-1160.36.2.el7.x86_64 x86_64)

 * 文档：https://help.ubuntu.com
 *管理：https://landscape.canonical.com
 * 支持：https://ubuntu.com/advantage

通过删除以下软件包和内容，该系统已被最小化
在用户未登录的系统上不需要。

To restore this content, you can run the 'unminimize' command.
Last login: Thu Apr 14 07:19:05 2022 from 10.244.0.67
root@mpi-job-mpiworker-0:~# 
```
## 注意
* 请确保所有容器中都可用 `sshd` 服务。
