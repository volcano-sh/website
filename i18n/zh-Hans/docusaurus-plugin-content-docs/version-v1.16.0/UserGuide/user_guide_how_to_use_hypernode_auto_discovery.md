---
title: "HyperNode 自动发现用户指南"
---


## 简介

本文介绍如何在 Volcano 中使用 HyperNode 网络拓扑自动发现功能。该功能自动发现集群内网络拓扑，并根据发现结果创建和维护 HyperNode 自定义资源（CR）。Volcano 调度器利用这些 HyperNode CR 进行调度决策，无需用户手动维护 HyperNode 信息。

## 前置条件

请先[安装 Volcano](https://github.com/volcano-sh/volcano/tree/master?tab=readme-ov-file#quick-start-guide)，版本需 >= v1.12.0。

## 配置

HyperNode 网络拓扑发现通过 ConfigMap 配置，其中包含 UFM、RoCE、label 等发现源的配置，请按集群环境修改。若 Volcano 未安装在默认命名空间，请将示例中的命名空间替换为实际值。

### Secret 配置（必需的第一步）

配置 UFM 发现前，须先创建 Kubernetes Secret 存储 UFM 凭据：

```bash
kubectl create secret generic ufm-credentials \
  --from-literal=username='your-ufm-username' \
  --from-literal=password='your-ufm-password' \
  -n volcano-system
```

> 请将 `your-ufm-username` 与 `your-ufm-password` 替换为实际 UFM 凭据，并按需调整命名空间。

### ConfigMap 示例

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: volcano-controller-configmap
  namespace: volcano-system # 若 Volcano 不在默认命名空间，请替换
data:
  volcano-controller.conf: |
    networkTopologyDiscovery:
      - source: ufm
        enabled: true
        interval: 10m
        credentials:
          secretRef:
            name: ufm-credentials # 存储 UFM 凭据的 Secret 名称
            namespace: volcano-system # Secret 所在命名空间
        config:
          endpoint: https://ufm-server:8080
          insecureSkipVerify: true
      - source: roce
        enabled: false
        interval: 15m
        config:
          endpoint: https://roce-server:9090
      - source: label
        enabled: true
        config:
          networkTopologyTypes:
            topologyA2:
              - nodeLabel: "volcano.sh/tor" # 标识节点所属 ToR 的标签；不同节点该标签值相同表示同属一个 ToR
              - nodeLabel: "kubernetes.io/hostname" # Kubernetes 自动添加的节点主机名标签
            topologyA3:
              - nodeLabel: "volcano.sh/hypercluster" # 标识节点所属 HyperCluster 的标签
              - nodeLabel: "volcano.sh/hypernode" # 标识节点所属 HyperNode 的标签
              - nodeLabel: "kubernetes.io/hostname"
```

### 配置项说明

* `source`：发现源，支持 `ufm`、`roce`、`label`。
* `enabled`：是否启用该发现源。
* `interval`：发现操作间隔，未指定时默认 1 小时。
* `config`：发现源配置，因源类型而异。
* `credentials`：访问发现源的凭据配置。
  * `secretRef`：引用包含凭据的 Kubernetes Secret。
    * `name`：Secret 名称。
    * `namespace`：Secret 命名空间。

#### UFM 配置项

* `endpoint`：UFM API 端点。
* `insecureSkipVerify`：是否跳过 TLS 证书校验，仅应在开发环境使用。

#### RoCE 配置项（当前不支持）

* `endpoint`：RoCE API 端点。
* `token`：RoCE API token。

#### Label 配置项

* `networkTopologyTypes`：支持多种网络拓扑类型（GPU、NPU 等）的结构。以下为 NPU 集群拓扑示例。
  * `topologyA2`：A2（Ascend 910B）集群拓扑类型。
    * `nodeLabel`：节点上有多个标签时，自下而上构建 HyperNode；最底层为 `kubernetes.io/hostname`，其上方为 `volcano.sh/tor`。
  * `topologyA3`：A3（Ascend 910C）集群拓扑类型。
    * `nodeLabel`：最底层为 `kubernetes.io/hostname`，上方为 `volcano.sh/hypernode` 与 `volcano.sh/hypercluster`。

* ```text
        tier2                     s4                                 s5                         
                          /               \                   /              \                 
        tier1           s0                s1                 s2              s3              
                     /      \          /      \           /      \        /      \         
                  node0    node1    node2    node3      node4   node5   node6   node7       
```

  集群各节点标签示例：
                node0:   kubernetes.io/hostname=192.168.1.10
                         volcano.sh/hypernode=s0
                         volcano.sh/hypercluster=s4
                node1:   kubernetes.io/hostname=192.168.1.11
                         volcano.sh/hypernode=s0
                         volcano.sh/hypercluster=s4
                ...（其余节点类似）

## 验证

1. 检查 Volcano controller 日志，确认发现源已成功启动：

```bash
kubectl logs -n volcano-system -l app=volcano-controllers -c volcano-controllers | grep "Successfully started all network topology discoverers"
```

2. 检查已创建的 HyperNode 资源：

```bash
kubectl get hypernodes -l volcano.sh/network-topology-source=<source>
```

将 `<source>` 替换为配置的发现源，如 `ufm` 或 `label`。

## 故障排查

* 若发现源未成功启动，请查看 Volcano controller 日志中的错误信息。
* 若未创建 HyperNode 资源，请检查发现源配置，并确认能连接到网络拓扑数据源。

## 最佳实践

* Volcano 使用 Kubernetes 标准 Secret 存储敏感凭据；若需更严格的加密，可考虑 [静态加密 Secret 数据](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/) 等机制。
* 可将凭据 Secret 放在指定命名空间以实现隔离。
* UFM 发现器仅需对包含凭据的 Secret 具有读权限。
* Label 发现器需要事先为节点打上与 HyperNode 对应的标签。
* 生产环境应配置适当的 RBAC 以限制 Secret 访问。
* 生产环境应启用 TLS 证书校验以防中间人攻击。
* 监控 Volcano controller 日志以发现错误。
* 设置合理的发现间隔，避免对网络拓扑数据源造成过大压力。
