++
title = "HyperNode 自动发现用户指南"
date = 2026-02-03
type = "docs"
weight = 50
url = "/zh/docs/user-guide/how_to_use_hypernode_auto_discovery/"
[menu.docs]
  parent = "user-guide"
++

## 介绍

本文介绍如何在 Volcano 中使用 **HyperNode 网络拓扑自动发现** 功能。  
该功能会自动发现集群内的网络拓扑结构，并基于发现结果创建与维护 HyperNode 自定义资源（CR）。  
Volcano 调度器基于这些 HyperNode CR 做调度决策，从而**免去用户手工维护 HyperNode 信息的负担**。

## 前置条件

请先安装版本 **>= v1.12.0** 的 Volcano，参见 [Volcano 安装说明](https://github.com/volcano-sh/volcano/tree/master?tab=readme-ov-file#quick-start-guide)。

## 配置

HyperNode 网络拓扑自动发现通过一个 ConfigMap 进行配置。  
该 ConfigMap 中定义了各种发现源（如 UFM、RoCE、label 等）的配置项，你可以根据自身集群环境进行修改。  
> 如 Volcano 未安装在 `volcano-system` 命名空间，请将示例中的命名空间替换为实际值。

### Secret 配置（**必须的第一步**）

在配置 UFM 发现源前，需要先创建一个 Kubernetes Secret 存储 UFM 访问凭据：

```bash
kubectl create secret generic ufm-credentials \
  --from-literal=username='your-ufm-username' \
  --from-literal=password='your-ufm-password' \
  -n volcano-system
```

> 注意：请将 `your-ufm-username` 与 `your-ufm-password` 替换为真实的 UFM 账号信息，并根据需要调整命名空间。

### ConfigMap 示例

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: volcano-controller-configmap
  namespace: volcano-system # 如 Volcano 不在默认命名空间，请替换为实际命名空间
data:
  volcano-controller.conf: |
    networkTopologyDiscovery:
      - source: ufm
        enabled: true
        interval: 10m
        credentials:
          secretRef:
            name: ufm-credentials      # 存放 UFM 凭据的 Secret 名称
            namespace: volcano-system  # 存放 UFM 凭据的 Secret 命名空间
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
              - nodeLabel: "volcano.sh/tor"           # 表示节点所属 TOR 的标签，同值代表同一 TOR
              - nodeLabel: "kubernetes.io/hostname"   # Kubernetes 内置 hostname 标签
            topologyA3:
              - nodeLabel: "volcano.sh/hypercluster"  # 表示节点所属 HyperCluster 的标签
              - nodeLabel: "volcano.sh/hypernode"     # 表示节点所属 HyperNode 的标签
              - nodeLabel: "kubernetes.io/hostname"   # Kubernetes 内置 hostname 标签
```

### 配置项说明

- `source`：发现源类型，支持 `ufm`、`roce` 与 `label`；
- `enabled`：是否启用该发现源；
- `interval`：执行发现任务的时间间隔，未配置时默认 1 小时；
- `config`：不同发现源的具体配置；
- `credentials`：访问发现源时的凭据配置：
  - `secretRef`：引用存放凭据的 Kubernetes Secret；
    - `name`：Secret 名称；
    - `namespace`：Secret 所在命名空间。

#### UFM 配置项

- `endpoint`：UFM API 访问地址；
- `insecureSkipVerify`：是否跳过 TLS 证书校验，仅建议在开发环境使用。

#### RoCE 配置项（当前暂不支持）

- `endpoint`：RoCE API 访问地址；
- `token`：RoCE API 访问令牌。

#### Label 配置项

- `networkTopologyTypes`：支持为不同类型集群（如 GPU、NPU 集群）定义各自的网络拓扑结构。下面示例为 NPU 集群的网络拓扑：
  - `topologyA2`：A2（Ascend 910B）集群的网络拓扑类型；
    - `nodeLabel`：当一个节点存在多个标签时，HyperNode 会自下而上构建。最底层通常是 `kubernetes.io/hostname`，在此之上是 `volcano.sh/tor`，用于标识节点所属 TOR 交换机。
  - `topologyA3`：A3（Ascend 910C）集群的网络拓扑类型；
    - `nodeLabel`：同样从底到上依次包括：`kubernetes.io/hostname`、`volcano.sh/hypernode` 与 `volcano.sh/hypercluster`。其中：
      - `volcano.sh/hypernode`：表示节点所属 HyperNode；
      - `volcano.sh/hypercluster`：表示节点所属 HyperCluster。

示意结构：

```text
        tier2                     s4                                 s5                         
                          /               \                   /              \                 
        tier1           s0                s1                 s2              s3              
                     /      \          /      \           /      \        /      \         
                  node0    node1    node2    node3      node4   node5   node6   node7       
```

集群中每个节点对应的标签示例如下：

- node0:
  - `kubernetes.io/hostname=192.168.1.10`   # 节点 IP
  - `volcano.sh/hypernode=s0`              # HyperNode 名称
  - `volcano.sh/hypercluster=s4`           # HyperCluster 名称
- node1:
  - `kubernetes.io/hostname=192.168.1.11`
  - `volcano.sh/hypernode=s0`
  - `volcano.sh/hypercluster=s4`
- node2:
  - `kubernetes.io/hostname=192.168.1.12`
  - `volcano.sh/hypernode=s1`
  - `volcano.sh/hypercluster=s4`
- node3:
  - `kubernetes.io/hostname=192.168.1.13`
  - `volcano.sh/hypernode=s1`
  - `volcano.sh/hypercluster=s4`
- node4:
  - `kubernetes.io/hostname=192.168.1.14`
  - `volcano.sh/hypernode=s2`
  - `volcano.sh/hypercluster=s5`
- node5:
  - `kubernetes.io/hostname=192.168.1.15`
  - `volcano.sh/hypernode=s2`
  - `volcano.sh/hypercluster=s5`
- node6:
  - `kubernetes.io/hostname=192.168.1.16`
  - `volcano.sh/hypernode=s3`
  - `volcano.sh/hypercluster=s5`
- node7:
  - `kubernetes.io/hostname=192.168.1.17`
  - `volcano.sh/hypernode=s3`
  - `volcano.sh/hypercluster=s5`

## 验证

1. 查看 Volcano controller 日志，确认所有发现源组件启动成功：

   ```bash
   kubectl logs -n volcano-system -l app=volcano-controllers -c volcano-controllers | grep "Successfully started all network topology discoverers"
   ```

2. 检查已创建的 HyperNode 资源：

   ```bash
   kubectl get hypernodes -l volcano.sh/network-topology-source=<source>
   ```

   将 `<source>` 替换为你配置的发现源，例如 `ufm` 或 `label`。

## 故障排查

- 若发现源未成功启动，请检查 Volcano controller 日志中的错误信息；
- 若未创建任何 HyperNode 资源，请检查：
  - 发现源配置是否正确；
  - 发现源是否能正常访问底层网络拓扑数据源（例如 UFM 或 RoCE API）。

## 最佳实践

- Volcano 使用标准 Kubernetes Secret 存储敏感凭据信息（用户名/密码或 token）。  
  若需更严格的密钥保护，建议结合 [Kubernetes 静态加密机制](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)；
- 将凭据 Secret 放置在专用命名空间，便于隔离与权限控制；
- 对于 UFM 发现源，Controller 仅需对包含凭据的 Secret 拥有读权限；
- 对于 Label 发现源，需要提前为节点打上对应的拓扑相关标签；
- 生产环境中应合理配置 RBAC，限制对 Secret 的访问权限；
- 推荐开启 TLS 证书校验，防止中间人攻击；
- 通过监控 Volcano controller 日志及时发现异常；
- 为避免对网络拓扑数据源造成压力，应设置合适的发现周期（`interval`）。

