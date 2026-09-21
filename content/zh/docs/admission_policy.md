+++
title = "准入策略"

date = 2025-09-18
lastmod = 2025-09-18

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "准入策略"
[menu.docs]
  parent = "concepts"
  weight = 7
+++

## 介绍
Volcano 支持验证准入策略（VAP）和变更准入策略（MAP），用于在创建或更新 Volcano 资源（如 Jobs、Pods、Queues、PodGroups）时进行验证和自动修改。这些策略与现有的 Volcano 准入 webhook 协同工作，使用 Kubernetes 原生准入策略提供额外的验证和变更功能。

> **注意**：VAP 和 MAP **默认未启用**。您必须在安装时明确启用它们。

## 安装和配置
### 前置条件
- ValidatingAdmissionPolicy 需要 Kubernetes 1.30+（1.30 版本稳定）
- MutatingAdmissionPolicy 需要 Kubernetes 1.32+（1.32 版本测试）

### 启用 VAP 和 MAP

#### 方式一：Helm 安装
安装 Volcano 时配置以下值：

```bash
# 启用 VAP 和 MAP 安装 Volcano
helm install volcano volcano/volcano --namespace volcano-system --create-namespace \
  --set custom.vap_enable=true \
  --set custom.map_enable=true

# 或升级现有安装
helm upgrade volcano volcano/volcano --namespace volcano-system \
  --set custom.vap_enable=true \
  --set custom.map_enable=true
```

或者在 `values.yaml` 中设置这些值：

```yaml
custom:
  vap_enable: true  # 启用验证准入策略
  map_enable: true  # 启用变更准入策略
```

#### 方式二：YAML 安装
您也可以直接使用 YAML 清单安装 Volcano。根据需求选择相应的文件：

```bash
# 安装不启用 VAP/MAP 的 Volcano（默认）
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/master/installer/volcano-development.yaml

# 安装仅启用 VAP 的 Volcano
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/master/installer/volcano-development-vap.yaml

# 安装同时启用 VAP 和 MAP 的 Volcano
kubectl apply -f https://raw.githubusercontent.com/volcano-sh/volcano/master/installer/volcano-development-vap-map.yaml
```


## 关键字段

### vap_enable
`vap_enable` 启用验证准入策略。启用后，Volcano 将在创建或更新所有 Volcano 资源前进行验证。

### map_enable
`map_enable` 启用变更准入策略。启用后，Volcano 将自动为 Jobs、Pods 和其他资源设置默认值。

> **重要**：相比现有 webhook，MAP 提供部分功能。它处理作业级默认值，但在任务级修改方面有限制。现有的 webhook 系统将继续与 MAP 协同工作。

## 使用

### 验证策略是否生效
安装后，检查策略是否运行：

```bash
# 检查验证准入策略
kubectl get validatingadmissionpolicy | grep volcano

# 检查变更准入策略
kubectl get mutatingadmissionpolicy | grep volcano

# 验证策略绑定
kubectl get validatingadmissionpolicybinding | grep volcano
kubectl get mutatingadmissionpolicybinding | grep volcano
```

### 测试验证
尝试创建无效作业以查看验证效果：

```bash
# 这将因重复任务名称被拒绝
kubectl apply -f - <<EOF
apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: invalid-job
spec:
  tasks:
    - name: worker
      replicas: 1
      template:
        spec:
          containers:
          - image: nginx
            name: nginx
    - name: worker  # 重复名称 - 将被拒绝
      replicas: 1
      template:
        spec:
          containers:
          - image: nginx
            name: nginx
EOF
```

## 注意事项
- VAP 和 MAP 与现有 Volcano webhook 协同工作，提供额外的验证和变更能力
- 由于技术限制，MAP 在任务级修改方面有一些限制
- ValidatingAdmissionPolicy 需要 Kubernetes 1.30+（1.30 版本起稳定）
- MutatingAdmissionPolicy 需要 Kubernetes 1.32+（1.32 版本起测试）
- 如果策略不工作，请验证您的 Kubernetes 版本是否满足最低要求